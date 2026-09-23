/* eslint-disable no-console */
import { Router } from 'express';
import { License, User, mongoose, type LicenseRecord } from '@smm/database';
import { generateLicenseKey } from '@smm/security';
import {
  ApiError,
  AUDIT_ACTIONS,
  ROLES,
  adminRequestsQuerySchema,
  approveAdminRequestSchema,
  rejectAdminRequestSchema,
  type AdminRequestStatus,
} from '@smm/types';
import {
  buildSubdomainAssignment,
  ipFrom,
  toLicense,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { runInTransaction, withSession } from '../../helpers/transactions';
import { serializeUser } from '../../helpers/transform';

/**
 * Account storage statuses for each request decision. An approved request is
 * stored as an `active` account (so the admin can sign in and hold a session);
 * `approved` is the request-level label surfaced to the Super Admin UI. The
 * single source of truth is the ACCOUNT status in the database — the request
 * label is derived from it so filters and rows stay consistent.
 */
const REQUEST_TO_ACCOUNT_STATUS: Record<AdminRequestStatus, string[]> = {
  pending: ['pending'],
  approved: ['active'],
  rejected: ['rejected'],
};

const ACCOUNT_TO_REQUEST_STATUS: Record<string, AdminRequestStatus> = {
  pending: 'pending',
  active: 'approved',
  rejected: 'rejected',
};

/** All account storage statuses that represent a request awaiting/decided. */
const REQUEST_ACCOUNT_STATUSES = [
  ...REQUEST_TO_ACCOUNT_STATUS.pending,
  ...REQUEST_TO_ACCOUNT_STATUS.approved,
  ...REQUEST_TO_ACCOUNT_STATUS.rejected,
];

/**
 * Admin self-registration approvals.
 *
 *  - GET  /count        pending/rejected counts (nav badge).
 *  - GET  /             requests (pending or rejected), paginated.
 *  - GET  /:id          single request detail.
 *  - POST /:id/approve  approve a pending application. Optionally issues an
 *                       active license for the admin at the same time; when an
 *                       application already holds a license (unique per admin)
 *                       that license is preserved and only the account is
 *                       activated. When no license is requested the admin
 *                       becomes `active` without one and cannot sign in until a
 *                       license is issued.
 *  - POST /:id/reject   reject a pending application with a reason.
 *
 * Every route is protected by requireSuperAdmin() (super-admin/index.ts).
 */
export function superAdminAdminRequestsRouter(): Router {
  const router = Router();

  router.get('/count', async (_req, res) => {
    const [pending, rejected] = await Promise.all([
      User.countDocuments({ role: ROLES.ADMIN, status: 'pending' }),
      User.countDocuments({ role: ROLES.ADMIN, status: 'rejected' }),
    ]);
    res.json({ data: { pending, rejected } });
  });

  router.get(
    '/',
    validateQuery(adminRequestsQuerySchema),
    async (req, res) => {
      const q = res.locals.query as {
        page: number;
        limit: number;
        search?: string;
        status?: AdminRequestStatus;
      };
      const accountStatuses = q.status
        ? REQUEST_TO_ACCOUNT_STATUS[q.status]
        : REQUEST_ACCOUNT_STATUSES;

      const filter: Record<string, unknown> = { role: ROLES.ADMIN, status: { $in: accountStatuses } };
      if (q.search) {
        const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
      }

      const [total, users, pending, rejected] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip((q.page - 1) * q.limit)
          .limit(q.limit)
          .lean(),
        User.countDocuments({ role: ROLES.ADMIN, status: 'pending' }),
        User.countDocuments({ role: ROLES.ADMIN, status: 'rejected' }),
      ]);

      const licenses = await License.find({ adminUserId: { $in: users.map((u) => u._id) } }).lean();
      const licenseByAdmin = new Map(licenses.map((l) => [String(l.adminUserId), l]));

      const items = users.map((u) => ({
        ...serializeUser(u),
        requestStatus: ACCOUNT_TO_REQUEST_STATUS[u.status] ?? u.status,
        license: licenseByAdmin.get(String(u._id))
          ? { status: licenseByAdmin.get(String(u._id))!.status, licenseKey: licenseByAdmin.get(String(u._id))!.licenseKey }
          : null,
      }));

      res.json({
        data: {
          items,
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
          counts: { pending, rejected },
        },
      });
    },
  );

  router.get('/:id', async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, status: { $in: REQUEST_ACCOUNT_STATUSES } }).lean();
    if (!user) throw ApiError.notFound('Admin request not found.');
    const license = await License.findOne({ adminUserId: user._id }).lean();
    const reviewer = user.approvedBy ? await User.findById(user.approvedBy).select('name email').lean() : null;

    res.json({
      data: {
        request: {
          ...serializeUser(user),
          requestStatus: ACCOUNT_TO_REQUEST_STATUS[user.status] ?? user.status,
          license: license
            ? {
                ...toLicense(license, user.name, user.email, {
                  subdomainSlug: user.subdomainSlug,
                  subdomain: user.subdomain,
                  subdomainStatus: user.subdomainStatus,
                }),
                history: license.history ?? [],
              }
            : null,
          reviewedBy: reviewer ? { id: String(reviewer._id), name: reviewer.name, email: reviewer.email } : null,
        },
      },
    });
  });

  router.post('/:id/approve', validateBody(approveAdminRequestSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { licenseDurationDays?: number; maxUsers?: number };
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, status: 'pending' }).lean();
    if (!admin) throw ApiError.notFound('Admin request not found.');

    // An admin can own at most one license (unique index on License.adminUserId).
    // If one already exists it belongs to this admin — preserve it as-is and
    // never mint a second one. Approving a pending request only flips the
    // account to `active`; the license document is not created, replaced or
    // mutated by this operation.
    const existingLicense = await License.findOne({ adminUserId: admin._id }).lean();
    const licenseDurationDays = body.licenseDurationDays;

    const update: Record<string, unknown> = {
      status: 'active',
      approvedBy: req.ctx.user._id,
      approvedAt: new Date(),
      rejectionReason: null,
    };
    if (existingLicense) update.licenseId = existingLicense._id;

    let createdLicense: mongoose.HydratedDocument<LicenseRecord> | null = null;

    if (licenseDurationDays !== undefined && !existingLicense) {
      // Approve + license atomically. The admin gets a provisional subdomain
      // (their permanent panel URL) and an active license, exactly like the
      // direct "New admin" creation path.
      const subdomain = admin.subdomainSlug ? null : await buildSubdomainAssignment(admin.name);
      try {
        await runInTransaction(async (dbSession) => {
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
                    expiresAt: new Date(Date.now() + licenseDurationDays * 24 * 60 * 60 * 1000),
                    createdBy: req.ctx.user._id,
                    maxUsers: body.maxUsers ?? 0,
                    metadata: { issuedOnApproval: true },
                    history: [
                      {
                        status: 'active',
                        at: new Date(),
                        by: req.ctx.user._id,
                        reason: `License issued on approval (${licenseDurationDays} days)`,
                      },
                    ],
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

          const userUpdate: Record<string, unknown> = { ...update, licenseId: license._id };
          if (subdomain) Object.assign(userUpdate, subdomain);
          await User.updateOne({ _id: admin._id }, { $set: userUpdate }, saveOptions);
          createdLicense = license;
        });
      } catch (err) {
        const dup = err as { code?: number; message?: string };
        if (dup.code === 11000 && /subdomainSlug/.test(dup.message ?? '')) {
          throw ApiError.conflict('Unable to reserve a unique subdomain for this admin. Please retry.');
        }
        throw err;
      }
    } else {
      // Preserve the existing license (if any) or approve without one. Only the
      // account record changes — a pending admin that already holds a license
      // (e.g. left over from a partial earlier flow) becomes active while that
      // license stays exactly where it is.
      await User.updateOne({ _id: admin._id }, { $set: update });
    }

    console.info(
      '[super-admin/admin-requests] approve',
      JSON.stringify({
        actorId: String(req.ctx.user._id),
        targetId: String(admin._id),
        email: admin.email,
        requestedStatus: 'approved',
        currentStatus: admin.status,
        licenseId: existingLicense ? String(existingLicense._id) : null,
        licenseOutcome: createdLicense ? 'created' : existingLicense ? 'reused' : 'none',
        licenseDurationDays: licenseDurationDays ?? null,
      }),
    );

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_APPROVE,
      targetType: 'admin',
      targetId: String(admin._id),
      targetLabel: admin.email,
      ip: ipFrom(req),
      metadata: {
        licenseIssued: Boolean(createdLicense),
        licenseReused: !createdLicense && Boolean(existingLicense),
        licenseDurationDays: licenseDurationDays ?? null,
      },
    });

    const updated = await User.findById(admin._id).lean();
    const finalLicense = createdLicense ?? existingLicense ?? null;
    res.json({
      data: {
        admin: serializeUser(updated!),
        license: finalLicense ? toLicense(finalLicense) : null,
        message: createdLicense
          ? 'Admin approved and licensed.'
          : existingLicense
            ? 'Admin approved. Existing license preserved.'
            : 'Admin approved without a license. Issue a license before they can sign in.',
      },
    });
  });

  router.post('/:id/reject', validateBody(rejectAdminRequestSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { reason: string };
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, status: 'pending' }).lean();
    if (!admin) throw ApiError.notFound('Admin request not found.');

    await User.updateOne(
      { _id: admin._id },
      {
        $set: {
          status: 'rejected',
          approvedBy: req.ctx.user._id,
          approvedAt: new Date(),
          rejectionReason: body.reason,
        },
      },
    );

    console.info(
      '[super-admin/admin-requests] reject',
      JSON.stringify({
        actorId: String(req.ctx.user._id),
        targetId: String(admin._id),
        email: admin.email,
        requestedStatus: 'rejected',
        currentStatus: admin.status,
        reasonProvided: Boolean(body.reason),
      }),
    );

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ADMIN_REJECT,
      targetType: 'admin',
      targetId: String(admin._id),
      targetLabel: admin.email,
      ip: ipFrom(req),
      metadata: { reason: body.reason },
    });

    const updated = await User.findById(admin._id).lean();
    res.json({ data: { admin: serializeUser(updated!), message: 'Admin request rejected.' } });
  });

  return router;
}