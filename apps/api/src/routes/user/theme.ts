import { Router } from 'express';
import { setUserThemePreference, getUserThemeSettings, getAdminThemeSettings, resolveUserPanelTheme, tenantAllowedThemes } from '@smm/database';
import {
  ApiError,
  AUDIT_ACTIONS,
  ROLES,
  isPanelTheme,
  updateOwnThemeOverrideSchema,
  type PanelTheme,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody } from '../../middleware/validate';

/**
 * The User Panel theme for the currently logged-in user.
 *
 * Resolved through `resolveUserPanelTheme` — respecting the Super Admin's
 * enabled set, the Main Admin's tenant selection and `allowUserOverride`, and
 * the user's own persisted override when overrides are enabled.
 */
export function userThemeRouter(): Router {
  const router = Router();

  router.get('/', async (req: AuthedRequest, res) => {
    const user = req.ctx.user;
    const resolution = await resolveUserPanelTheme(user);
    const tenantAdminId = resolution.source === 'default' ? null : resolution.tenantAdminId;

    let availableThemes: PanelTheme[] = [resolution.theme];
    let allowUserOverride = false;
    if (tenantAdminId) {
      const adminConfig = await getAdminThemeSettings(tenantAdminId);
      availableThemes = tenantAllowedThemes(adminConfig);
      const settings = await getUserThemeSettings(tenantAdminId);
      allowUserOverride = settings.allowUserOverride;
    }

    res.json({
      data: {
        theme: resolution.theme,
        allowUserOverride,
        overrideApplied: resolution.source === 'override',
        source: resolution.source,
        tenantAdminId,
        availableThemes,
      },
    });
  });

  router.patch('/', validateBody(updateOwnThemeOverrideSchema), async (req: AuthedRequest, res) => {
    const user = req.ctx.user;
    const body = req.body as { theme: PanelTheme };
    if (!isPanelTheme(body.theme)) throw ApiError.validation('Select a valid theme');

    const resolution = await resolveUserPanelTheme(user);
    const tenantAdminId = resolution.tenantAdminId;
    if (!tenantAdminId) {
      throw ApiError.forbidden('Your account is not assigned to a panel. Contact your administrator.');
    }
    const adminConfig = await getAdminThemeSettings(tenantAdminId);
    if (!tenantAllowedThemes(adminConfig).includes(body.theme)) {
      throw ApiError.validation('That theme is disabled for your panel.');
    }
    const settings = await getUserThemeSettings(tenantAdminId);
    if (!settings.allowUserOverride) {
      throw ApiError.forbidden('Personal theme overrides are disabled by your administrator.');
    }

    await setUserThemePreference(String(user._id), body.theme, user._id);

    await writeAuditLog({
      actorId: String(user._id),
      actorName: user.name,
      actorRole: ROLES.USER,
      action: AUDIT_ACTIONS.USER_THEME_OVERRIDE_CHANGED,
      targetType: 'user',
      targetId: String(user._id),
      targetLabel: user.email,
      ip: ipFrom(req),
      metadata: { theme: body.theme, tenantAdminId },
    });

    res.json({
      data: {
        theme: body.theme,
        allowUserOverride: true,
        overrideApplied: true,
        source: 'override' as const,
        tenantAdminId,
        availableThemes: tenantAllowedThemes(adminConfig),
        updatedAt: new Date().toISOString(),
      },
    });
  });

  return router;
}