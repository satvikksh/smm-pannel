import { Router } from 'express';
import { License, User, mongoose, type LicenseRecord } from '@smm/database';
import { generateLicenseKey } from '@smm/security';
import {
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  createLicenseSchema,
  paginationSchema,
  renewLicenseSchema,
  updateLicenseStatusSchema,
} from '@smm/types';
import {
  toLicense,
  buildSubdomainAssignment,
  ipFrom,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { runInTransaction, withSession } from '../../helpers/transactions';
import { serializeLicensesWithAdmins } from '../../helpers/transform';

export function superAdminLicensesRouter(): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(paginationSchema.extend({ status: updateLicenseStatusSchema.shape.status.optional() })),
    async (req, res) => {
      const q = res.locals.query as {
        page: number;
        limit: number;
        search?: string;
        status?: string;
      };
      const filter: Record<string, unknown> = {};
      if (q.status) filter.status = q.status;
      if (q.search) {
        const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const adminIds = (
          await User.find({ role: ROLES.ADMIN, $or: [{ name: rx }, { email: rx }] }).select('_id').lean()
        ).map((u) => u._id);
        filter.$or = [{ licenseKey: rx }, { adminUserId: { $in: adminIds } }];
      }
      const total = await License.countDocuments(filter);
      const licenses = await License.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean();
      res.json({
        data: {
          items: await serializeLicensesWithAdmins(licenses),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.post('/', validateBody(createLicenseSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { adminUserId: string; durationDays: number; maxUsers?: number; metadata?: Record<string, unknown> };
    const admin = await User.findOne({ _id: body.adminUserId, role: ROLES.ADMIN }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');

    const activeForAdmin = await License.exists({ adminUserId: admin._id, status: 'active' });
    if (activeForAdmin) {
      throw ApiError.conflict('This admin already holds an active license.');
    }

    // Issuing a license for an admin must also ensure the admin owns a unique
    // subdomain (the tenant's permanent panel URL). Existing subdomains are
    // preserved; only admins without one get a freshly generated slug.
    const subdomain = admin.subdomainSlug
      ? null
      : await buildSubdomainAssignment(admin.name);

    let created: mongoose.HydratedDocument<LicenseRecord>;
    try {
      created = await runInTransaction(async (dbSession) => {
        const saveOptions = withSession(dbSession);
        let license: mongoose.HydratedDocument<LicenseRecord> | null = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const licenseKey = generateLicenseKey();
          try {
            const docs = await License.create(
              [
                {
                  licenseKey,
                  adminUserId: admin._id,
                  status: 'active',
                  issuedAt: new Date(),
                  expiresAt: new Date(Date.now() + body.durationDays * 24 * 60 * 60 * 1000),
                  createdBy: req.ctx.user._id,
                  maxUsers: body.maxUsers ?? 0,
                  metadata: body.metadata ?? {},
                  history: [{ status: 'active', at: new Date(), by: req.ctx.user._id, reason: 'License issued' }],
                },
              ],
              withSession(dbSession) as { session: mongoose.ClientSession },
            );
            license = docs[0] ?? null;
            if (license) break;
          } catch (err) {
            if ((err as { code?: number }).code === 11000 && attempt < 4) continue;
            throw err;
          }
        }
        if (!license) throw ApiError.internal('Unable to generate a unique license key.');

        const userUpdate: Record<string, unknown> = { licenseId: license._id };
        if (subdomain) Object.assign(userUpdate, subdomain);
        await User.updateOne({ _id: admin._id }, { $set: userUpdate }, saveOptions);
        return license;
      });
    } catch (err) {
      const dup = err as { code?: number; message?: string };
      if (dup.code === 11000 && /subdomainSlug/.test(dup.message ?? '')) {
        throw ApiError.conflict('Unable to reserve a unique subdomain for this admin. Please retry.');
      }
      throw err;
    }

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.LICENSE_CREATE,
      targetType: 'license',
      targetId: String(created._id),
      targetLabel: created.licenseKey,
      ip: ipFrom(req),
      metadata: { durationDays: body.durationDays, subdomain: subdomain?.subdomain ?? admin.subdomain ?? null },
    });

    const fresh = await License.findById(created._id).lean();
    const adminSubdomain = subdomain
      ? { subdomainSlug: subdomain.subdomainSlug, subdomain: subdomain.subdomain, subdomainStatus: subdomain.subdomainStatus }
      : { subdomainSlug: admin.subdomainSlug, subdomain: admin.subdomain, subdomainStatus: admin.subdomainStatus };
    res.status(201).json({
      data: { license: toLicense(fresh!, admin.name, admin.email, adminSubdomain) },
    });
  });

  router.get('/:id', async (req, res) => {
    const license = await License.findById(req.params.id).lean();
    if (!license) throw ApiError.notFound('License not found.');
    const admin = await User.findById(license.adminUserId).lean();
    res.json({
      data: {
        license: {
          ...toLicense(license, admin?.name, admin?.email, {
            subdomainSlug: admin?.subdomainSlug,
            subdomain: admin?.subdomain,
            subdomainStatus: admin?.subdomainStatus,
          }),
          history: license.history ?? [],
        },
      },
    });
  });

  router.patch('/:id/status', validateBody(updateLicenseStatusSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { status: string; reason?: string };
    const license = await License.findById(req.params.id).lean();
    if (!license) throw ApiError.notFound('License not found.');

    await License.updateOne(
      { _id: license._id },
      {
        $set: { status: body.status },
        $push: {
          history: {
            status: body.status,
            at: new Date(),
            by: req.ctx.user._id,
            reason: body.reason ?? '',
          },
        },
      },
    );
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.LICENSE_UPDATE_STATUS,
      targetType: 'license',
      targetId: String(license._id),
      targetLabel: license.licenseKey,
      ip: ipFrom(req),
      metadata: { status: body.status, reason: body.reason },
    });
    const updated = await License.findById(license._id).lean();
    res.json({ data: { license: toLicense(updated!) } });
  });

  router.post('/:id/renew', validateBody(renewLicenseSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { durationDays: number };
    const license = await License.findById(req.params.id).lean();
    if (!license) throw ApiError.notFound('License not found.');
    if (license.status === 'revoked') {
      throw ApiError.licenseInvalid('A revoked license cannot be renewed.');
    }
    const base = new Date(Math.max(Date.now(), license.expiresAt.getTime()));
    const newExpiry = new Date(base.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

    await License.updateOne(
      { _id: license._id },
      {
        $set: { status: 'active', expiresAt: newExpiry },
        $push: {
          history: {
            status: 'active',
            at: new Date(),
            by: req.ctx.user._id,
            reason: `Renewed for ${body.durationDays} days`,
          },
        },
      },
    );
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.LICENSE_RENEW,
      targetType: 'license',
      targetId: String(license._id),
      targetLabel: license.licenseKey,
      ip: ipFrom(req),
      metadata: { durationDays: body.durationDays, newExpiry: newExpiry.toISOString() },
    });
    const updated = await License.findById(license._id).lean();
    res.json({ data: { license: toLicense(updated!) } });
  });

  return router;
}