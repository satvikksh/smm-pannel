import { Router } from 'express';
import { getAdminThemeSettings } from '@smm/database';
import { tenantAdminIdOf, type AuthedRequest } from '@smm/auth';

/**
 * The Admin Panel theme for the current admin's tenant. Resolved from the
 * Super-Admin controlled `AdminThemeSettings`; Sub Admins inherit their parent
 * Main Admin's theme. Read-only — the theme is only changed by the Super Admin.
 */
export function adminThemeRouter(): Router {
  const router = Router();

  router.get('/', async (req: AuthedRequest, res) => {
    const tenantAdminId = tenantAdminIdOf(req.ctx.user);
    const settings = await getAdminThemeSettings(tenantAdminId!);
    res.json({
      data: {
        theme: settings.theme,
        enabledThemes: settings.enabledThemes,
        defaultTheme: settings.defaultTheme,
        updatedAt: settings.updatedAt,
      },
    });
  });

  return router;
}