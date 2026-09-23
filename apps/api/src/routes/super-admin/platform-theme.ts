import { Router } from 'express';
import { getPlatformThemeMeta, setPlatformTheme } from '@smm/database';
import { AUDIT_ACTIONS, ROLES, updatePlatformThemeSchema, type PanelTheme } from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody } from '../../middleware/validate';

/**
 * Global platform theme (Appearance / Themes page).
 *
 *  - GET  /  current platform theme (Super Admin only; public /theme is the
 *            unauthenticated twin used by the panel providers on login pages).
 *  - PATCH / select one of the catalogued panel themes. Persisted globally and
 *            rolled out as the default for every admin panel and every tenant's
 *            user panel. Audited.
 */
export function superAdminPlatformThemeRouter(): Router {
  const router = Router();

  router.get('/', async (_req: AuthedRequest, res) => {
    const meta = await getPlatformThemeMeta();
    res.json({ data: meta });
  });

  router.patch('/', validateBody(updatePlatformThemeSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { theme: PanelTheme };
    const previous = await getPlatformThemeMeta();
    await setPlatformTheme(body.theme, req.ctx.user._id);

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.SUPER_ADMIN_CHANGED_PLATFORM_THEME,
      targetType: 'settings',
      targetId: 'platform',
      targetLabel: 'Platform theme',
      ip: ipFrom(req),
      metadata: {
        previousTheme: previous.theme,
        newTheme: body.theme,
      },
    });

    const updated = await getPlatformThemeMeta();
    res.json({ data: updated });
  });

  return router;
}