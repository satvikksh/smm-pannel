import { Router } from 'express';
import { User, getAdminThemeSettings, getUserThemeSettings, setUserThemeSettings, setUserThemePreference, clearUserThemePreference, tenantAllowedThemes } from '@smm/database';
import {
  ADMIN_SCOPES,
  ApiError,
  AUDIT_ACTIONS,
  PANEL_THEMES,
  ROLES,
  isPanelTheme,
  updateUserThemeOverrideSchema,
  updateUserThemeSettingsSchema,
  type PanelTheme,
} from '@smm/types';
import {
  assertAdminScope,
  assertMainAdmin,
  ipFrom,
  isSubAdmin,
  tenantAdminIdOf,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody } from '../../middleware/validate';

/**
 * Tenant-scoped User Panel theme control for an admin.
 *
 *  - GET /        tenant settings (Main Admin only).
 *  - PATCH /      update tenant theme + override flag (Main Admin only, audited).
 *  - GET /preview resolved tenant preview for any admin of the tenant.
 *  - POST /overrides set/change a per-user theme override for a tenant user.
 *                  Sub Admins may only touch users assigned to them (with the
 *                  manageUserTheme scope); the Main Admin may touch any tenant
 *                  user. Audited.
 *  - DELETE /overrides/:userId clear a per-user override (same scope rules).
 */
export function adminUserThemeRouter(): Router {
  const router = Router();

  function tenantId(user: AuthedRequest['ctx']['user']): string {
    return tenantAdminIdOf(user)!;
  }

  router.get('/', async (req: AuthedRequest, res) => {
    assertMainAdmin(req.ctx.user);
    const tenantAdminId = tenantId(req.ctx.user);
    const settings = await getUserThemeSettings(tenantAdminId);
    const adminConfig = await getAdminThemeSettings(tenantAdminId);
    res.json({
      data: {
        theme: settings.theme,
        allowUserOverride: settings.allowUserOverride,
        defaultTheme: adminConfig.defaultTheme,
        enabledThemes: tenantAllowedThemes(adminConfig),
        updatedAt: settings.updatedAt,
      },
    });
  });

  router.patch('/', validateBody(updateUserThemeSettingsSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { theme: PanelTheme; allowUserOverride: boolean };
    assertMainAdmin(req.ctx.user);
    const tenantAdminId = tenantId(req.ctx.user);
    const adminConfig = await getAdminThemeSettings(tenantAdminId);
    const allowed = tenantAllowedThemes(adminConfig);
    if (!allowed.includes(body.theme)) {
      throw ApiError.validation('That theme is disabled by the Super Admin for your tenant.');
    }

    const previous = await getUserThemeSettings(tenantAdminId);
    await setUserThemeSettings(tenantAdminId, body, req.ctx.user._id);

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_CHANGED_USER_THEME,
      targetType: 'admin',
      targetId: tenantAdminId,
      targetLabel: req.ctx.user.email,
      ip: ipFrom(req),
      metadata: {
        previousTheme: previous.theme,
        newTheme: body.theme,
        previousAllowUserOverride: previous.allowUserOverride,
        newAllowUserOverride: body.allowUserOverride,
      },
    });

    res.json({
      data: {
        theme: body.theme,
        allowUserOverride: body.allowUserOverride,
        defaultTheme: adminConfig.defaultTheme,
        enabledThemes: allowed,
        updatedAt: new Date().toISOString(),
      },
    });
  });

  router.get('/preview', async (req: AuthedRequest, res) => {
    const tenantAdminId = tenantId(req.ctx.user);
    const settings = await getUserThemeSettings(tenantAdminId);
    const adminConfig = await getAdminThemeSettings(tenantAdminId);
    res.json({
      data: {
        theme: settings.theme,
        allowUserOverride: settings.allowUserOverride,
        defaultTheme: adminConfig.defaultTheme,
        enabledThemes: tenantAllowedThemes(adminConfig),
        updatedAt: settings.updatedAt,
      },
    });
  });

  router.post('/overrides', validateBody(updateUserThemeOverrideSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { userId: string; theme: PanelTheme };
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.MANAGE_USER_THEME);

    if (!isPanelTheme(body.theme) || !PANEL_THEMES.includes(body.theme)) {
      throw ApiError.validation('Select a valid theme');
    }

    const tenantAdminId = tenantId(req.ctx.user);
    const adminConfig = await getAdminThemeSettings(tenantAdminId);
    const allowed = tenantAllowedThemes(adminConfig);
    if (!allowed.includes(body.theme)) {
      throw ApiError.validation('That theme is disabled by the Super Admin for your tenant.');
    }

    const target = await User.findOne({ _id: body.userId, role: ROLES.USER, adminId: tenantAdminId }).lean();
    if (!target) throw ApiError.notFound('User not found in your tenant.');

    // A Sub Admin may only set overrides for users assigned to them.
    if (isSubAdmin(req.ctx.user) && String(target.assignedTo ?? '') !== String(req.ctx.user._id)) {
      throw ApiError.forbidden('That user is not assigned to you.');
    }

    await setUserThemePreference(String(target._id), body.theme, req.ctx.user._id);

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: isSubAdmin(req.ctx.user)
        ? AUDIT_ACTIONS.PARTIAL_ADMIN_CHANGED_USER_THEME
        : AUDIT_ACTIONS.ADMIN_CHANGED_USER_THEME,
      targetType: 'user',
      targetId: String(target._id),
      targetLabel: target.email,
      ip: ipFrom(req),
      metadata: { theme: body.theme, tenantAdminId },
    });

    res.json({
      data: {
        userId: String(target._id),
        theme: body.theme,
        allowed: allowed.includes(body.theme),
      },
    });
  });

  router.delete('/overrides/:userId', async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.MANAGE_USER_THEME);
    const tenantAdminId = tenantId(req.ctx.user);
    const target = await User.findOne({ _id: req.params.userId, role: ROLES.USER, adminId: tenantAdminId }).lean();
    if (!target) throw ApiError.notFound('User not found in your tenant.');
    if (isSubAdmin(req.ctx.user) && String(target.assignedTo ?? '') !== String(req.ctx.user._id)) {
      throw ApiError.forbidden('That user is not assigned to you.');
    }
    await clearUserThemePreference(String(target._id));
    res.json({ data: { userId: String(target._id), message: 'Override cleared.' } });
  });

  return router;
}