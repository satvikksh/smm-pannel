import { Router } from 'express';
import { getAdminThemeSettings, setAdminThemeSettings, tenantAllowedThemes } from '@smm/database';
import {
  ApiError,
  AUDIT_ACTIONS,
  ROLES,
  updateAdminPanelThemeSchema,
  type PanelTheme,
} from '@smm/types';
import {
  assertMainAdmin,
  ipFrom,
  tenantAdminIdOf,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody } from '../../middleware/validate';

/**
 * The Admin Panel theme for the current admin's tenant. Resolved from the
 * Super-Admin controlled `AdminThemeSettings`; Sub Admins inherit their parent
 * Main Admin's theme.
 *
 *  - GET   read-only — the theme is configured by the Main Admin and by the
 *          Super Admin (global platform rollout).
 *  - PATCH the Main Admin may pick their own panel theme, restricted to the
 *          themes the Super Admin has enabled for that tenant. Audited.
 */
export function adminThemeRouter(): Router {
  const router = Router();

  router.get('/', async (req: AuthedRequest, res) => {
    const tenantAdminId = tenantAdminIdOf(req.ctx.user)!;
    const settings = await getAdminThemeSettings(tenantAdminId);
    res.json({
      data: {
        theme: settings.theme,
        enabledThemes: settings.enabledThemes,
        defaultTheme: settings.defaultTheme,
        updatedAt: settings.updatedAt,
      },
    });
  });

  router.patch('/', validateBody(updateAdminPanelThemeSchema), async (req: AuthedRequest, res) => {
    assertMainAdmin(req.ctx.user);
    const body = req.body as { theme: PanelTheme };
    const tenantAdminId = tenantAdminIdOf(req.ctx.user)!;
    const settings = await getAdminThemeSettings(tenantAdminId);
    if (!tenantAllowedThemes(settings).includes(body.theme)) {
      throw ApiError.validation('That theme is disabled by the Super Admin for your tenant.');
    }

    const previous = await getAdminThemeSettings(tenantAdminId);
    await setAdminThemeSettings(
      tenantAdminId,
      { theme: body.theme, enabledThemes: settings.enabledThemes, defaultTheme: settings.defaultTheme },
      req.ctx.user._id,
    );

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_CHANGED_PANEL_THEME,
      targetType: 'admin',
      targetId: tenantAdminId,
      targetLabel: req.ctx.user.email,
      ip: ipFrom(req),
      metadata: { previousTheme: previous.theme, newTheme: body.theme },
    });

    const updated = await getAdminThemeSettings(tenantAdminId);
    res.json({ data: updated });
  });

  return router;
}