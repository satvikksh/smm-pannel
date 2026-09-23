import { Router } from 'express';
import { z } from 'zod';
import { AuditLog, License, User, mongoose, type LicenseRecord, type UserRecord } from '@smm/database';
import { hashPassword, generateLicenseKey } from '@smm/security';
import {
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  createAdminSchema,
  paginationSchema,
  resetPasswordSchema,
  updateAdminStatusSchema,
  updateAdminSubdomainSchema,
} from '@smm/types';
import type { SafeUser } from '@smm/types';
import {
  toSafeUser,
  toLicense,
  buildSubdomainAssignment,
  ipFrom,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { runInTransaction, withSession } from '../../helpers/transactions';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeAuditLog, serializeUser } from '../../helpers/transform';

export function superAdminAdminsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(paginationSchema.extend({ status: z.enum(['active', 'suspended', 'inactive', 'pending', 'rejected']).optional() })),
    async (req, res) => {
    const q = res.locals.query as {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    };
    const filter: Record<string, unknown> = { role: ROLES.ADMIN };
    if (q.status) filter.status = q.status;
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean();
    const licenses = await License.find({ adminUserId: { $in: users.map((u) => u._id) } }).lean();
    const licenseByAdmin = new Map(licenses.map((l) => [String(l.adminUserId), l]));

    const items = users.map((u) => {
      const safe = serializeUser(u) as SafeUser & { license?: unknown };
      const lic = licenseByAdmin.get(String(u._id));
      return {
        ...safe,
        license: lic
          ? { status: lic.status, licenseKey: lic.licenseKey }
          : null,
      };
    });

    res.json({
      data: {
        items,
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
    });
  });

  router.post('/', validateBody(createAdminSchema), async (req: AuthedRequest, res) => {
    const body = req.body as {
      name: string;
      email: string;
      phone: string;
      password: string;
      licenseDurationDays: number;
      maxUsers?: number;
    };
    const email = body.email.trim().toLowerCase();
    const actor = req.ctx.user;

    const existing = await User.findOne({ email }).lean();
    if (existing) throw ApiError.conflict('An account with this email already exists.');
    const existingPhone = await User.findOne({ phone: body.phone }).lean();
    if (existingPhone) throw ApiError.conflict('An account with this phone number already exists.');

    const passwordHash = await hashPassword(body.password);

    // Admin + license + subdomain are created atomically when the deployment
    // supports MongoDB transactions; on standalone local mongod we degrade to
    // sequential inserts (still retry-safe for unique license keys and slugs).
    let createdUser: mongoose.HydratedDocument<UserRecord> | null = null;
    let createdLicense: mongoose.HydratedDocument<LicenseRecord> | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      // Subdomain ownership is stored on the Admin (the tenant). The unique
      // partial index on `subdomainSlug` is the hard guarantee; a concurrent
      // race retries with the next free `-N` slug.
      const subdomain = await buildSubdomainAssignment(body.name);
      try {
        const result = await runInTransaction(async (dbSession) => {
          const saveOptions = withSession(dbSession);
          const user = new User({
            name: body.name,
            email,
            phone: body.phone,
            passwordHash,
            role: ROLES.ADMIN,
            status: 'active',
            subdomainSlug: subdomain.subdomainSlug,
            subdomain: subdomain.subdomain,
            subdomainStatus: subdomain.subdomainStatus,
            subdomainCreatedAt: subdomain.subdomainCreatedAt,
          });
          const savedUser = await user.save(saveOptions);

          // Generate a unique license key with retries on the (rare) duplicate.
          let license: mongoose.HydratedDocument<LicenseRecord> | null = null;
          for (let keyAttempt = 0; keyAttempt < 5; keyAttempt += 1) {
            const licenseKey = generateLicenseKey();
            try {
              const docs = await License.create(
                [
                  {
                    licenseKey,
                    adminUserId: savedUser._id,
                    status: 'active',
                    issuedAt: new Date(),
                    expiresAt: new Date(Date.now() + body.licenseDurationDays * 24 * 60 * 60 * 1000),
                    createdBy: actor._id,
                    maxUsers: body.maxUsers ?? 0,
                    metadata: {},
                    history: [
                      {
                        status: 'active',
                        at: new Date(),
                        by: actor._id,
                        reason: 'Issued on admin creation',
                      },
                    ],
                  },
                ],
                withSession(dbSession) as { session: mongoose.ClientSession },
              );
              license = docs[0] ?? null;
              if (license) break;
            } catch (err) {
              if ((err as { code?: number }).code === 11000 && keyAttempt < 4) continue;
              throw err;
            }
          }
          if (!license) throw ApiError.internal('Unable to generate a unique license key.');

          savedUser.licenseId = license._id;
          await savedUser.save(saveOptions);
          return { createdUser: savedUser, createdLicense: license };
        });
        createdUser = result.createdUser;
        createdLicense = result.createdLicense;
        break;
      } catch (err) {
        const dup = err as { code?: number; message?: string };
        if (dup.code === 11000 && /subdomainSlug/.test(dup.message ?? '') && attempt < 2) continue;
        throw err;
      }
    }
    if (!createdUser || !createdLicense) {
      throw ApiError.internal('Unable to reserve a unique subdomain for this admin.');
    }

    await writeAuditLog({
      actorId: String(actor._id),
      actorName: actor.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_CREATE,
      targetType: 'admin',
      targetId: String(createdUser._id),
      targetLabel: body.email,
      result: 'success',
      ip: ipFrom(req),
      metadata: { licenseDurationDays: body.licenseDurationDays },
    });

    res.status(201).json({
      data: {
        admin: toSafeUser(createdUser),
        license: toLicense(createdLicense, createdUser.name, createdUser.email, {
          subdomainSlug: createdUser.subdomainSlug,
          subdomain: createdUser.subdomain,
          subdomainStatus: createdUser.subdomainStatus,
        }),
      },
    });
  });

  router.get('/:id', async (req: AuthedRequest, res) => {
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');
    const license = await License.findOne({ adminUserId: admin._id }).lean();
    const activity = await AuditLog.find({
      $or: [{ actorId: admin._id }, { targetId: String(admin._id) }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      data: {
        admin: toSafeUser(admin),
        license: license
          ? {
              ...toLicense(license, admin.name, admin.email, {
                subdomainSlug: admin.subdomainSlug,
                subdomain: admin.subdomain,
                subdomainStatus: admin.subdomainStatus,
              }),
              history: license.history ?? [],
            }
          : null,
        recentActivity: activity.map(serializeAuditLog),
      },
    });
  });

  router.patch('/:id/status', validateBody(updateAdminStatusSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { status: string };
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');
    await User.updateOne({ _id: admin._id }, { $set: { status: body.status } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_UPDATE_STATUS,
      targetType: 'admin',
      targetId: String(admin._id),
      targetLabel: admin.email,
      ip: ipFrom(req),
      metadata: { status: body.status },
    });
    const updated = await User.findById(admin._id).lean();
    res.json({ data: { admin: toSafeUser(updated!) } });
  });

  router.patch('/:id/subdomain', validateBody(updateAdminSubdomainSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { action: 'disable' | 'enable' | 'regenerate' };
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');

    let update: Record<string, unknown>;
    let message: string;
    if (body.action === 'disable') {
      if (!admin.subdomainSlug) throw ApiError.badRequest('This admin does not have a subdomain yet.');
      update = { subdomainStatus: 'disabled' };
      message = 'Subdomain disabled.';
    } else if (body.action === 'enable') {
      if (!admin.subdomainSlug) throw ApiError.badRequest('This admin does not have a subdomain yet.');
      update = { subdomainStatus: 'active' };
      message = 'Subdomain enabled.';
    } else {
      const assignment = await buildSubdomainAssignment(admin.name);
      update = { ...assignment, subdomainStatus: 'active' };
      message = 'Subdomain regenerated.';
    }

    await User.updateOne({ _id: admin._id }, { $set: update });
    const updated = await User.findById(admin._id).lean();

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_SUBDOMAIN_UPDATE,
      targetType: 'admin',
      targetId: String(admin._id),
      targetLabel: admin.email,
      ip: ipFrom(req),
      metadata: { action: body.action, subdomain: updated?.subdomain ?? null },
    });

    res.json({ data: { admin: toSafeUser(updated!), message } });
  });

  router.patch('/:id/password', validateBody(resetPasswordSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { newPassword: string };
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');
    const passwordHash = await hashPassword(body.newPassword);
    await User.updateOne({ _id: admin._id }, { $set: { passwordHash } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_RESET_PASSWORD,
      targetType: 'admin',
      targetId: String(admin._id),
      targetLabel: admin.email,
      ip: ipFrom(req),
    });
    res.json({ data: { message: 'Password reset successfully.' } });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');
    await User.updateOne({ _id: admin._id }, { $set: { status: 'deleted' } });
    if (admin.licenseId) {
      await License.updateOne(
        { _id: admin.licenseId, status: { $ne: 'revoked' } },
        { $set: { status: 'revoked' }, $push: { history: { status: 'revoked', at: new Date(), by: req.ctx.user._id, reason: 'Admin deleted' } } },
      );
    }
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_DELETE,
      targetType: 'admin',
      targetId: String(admin._id),
      targetLabel: admin.email,
      ip: ipFrom(req),
    });
    res.json({ data: { message: 'Admin deleted.' } });
  });

  router.get('/:id/activity', async (req, res) => {
    const q = res.locals.query as { page?: number; limit?: number } | undefined;
    const page = q?.page ?? 1;
    const limit = q?.limit ?? 20;
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');
    const filter = { $or: [{ actorId: admin._id }, { targetId: String(admin._id) }] };
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({
      data: {
        items: logs.map(serializeAuditLog),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  });

  return router;
}