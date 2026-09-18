import { Router } from 'express';
import { License, User } from '@smm/database';
import { ApiError, AUDIT_ACTIONS, ROLES, activateLicenseSchema } from '@smm/types';
import {
  adminLicenseVerdict,
  ipFrom,
  licenseError,
  loadLicenseForAdmin,
  requireAdminSession,
  resolveTenantAdminUser,
  toLicense,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody } from '../../middleware/validate';

/**
 * License status + activation for the authenticated admin.
 *
 * These routes use the session-only guard on purpose: an admin whose license is
 * missing, expired, suspended or revoked must still be able to reach them in
 * order to see why access is blocked and to activate a key. Every other
 * /api/v1/admin route stays behind the licensed `requireAdmin()` guard.
 *
 * Sub Admins inherit the tenant license: activation binds the tenant's shared
 * license to their own account row (their `licenseId`), never a separate one.
 */
export function adminLicenseRouter(): Router {
  const router = Router();
  router.use(requireAdminSession());

  router.get('/', async (req: AuthedRequest, res) => {
    const license = await loadLicenseForAdmin(req.ctx.user);
    const verdict = adminLicenseVerdict(req.ctx.user, license);
    res.json({
      data: {
        license: license ? toLicense(license) : null,
        valid: verdict.valid,
        reason: verdict.reason,
      },
    });
  });

  router.post('/activate', validateBody(activateLicenseSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { licenseKey: string };
    const licenseKey = body.licenseKey.trim().toUpperCase();

    const tenantAdmin = await resolveTenantAdminUser(req.ctx.user);

    const license = await License.findOne({ licenseKey }).lean();
    if (!license) {
      throw ApiError.licenseInvalid('That license key is not recognised.');
    }

    // Ownership is mandatory: a license may only ever be activated by the admin
    // it was issued to. Sub Admins may activate their tenant's license only.
    // This blocks cross-tenant license reuse.
    if (String(license.adminUserId) !== String(tenantAdmin._id)) {
      throw ApiError.licenseInvalid('That license key belongs to a different admin.');
    }

    const err = licenseError(license);
    if (err) throw ApiError.licenseInvalid(err.message);

    // Bind the license to the admin identity (idempotent).
    await User.updateOne({ _id: req.ctx.user._id }, { $set: { licenseId: license._id } });

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.LICENSE_ACTIVATE,
      targetType: 'license',
      targetId: String(license._id),
      targetLabel: license.licenseKey,
      ip: ipFrom(req),
    });

    res.json({ data: { license: toLicense(license), valid: true, reason: null } });
  });

  return router;
}
