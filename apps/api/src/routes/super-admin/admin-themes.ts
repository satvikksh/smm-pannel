import { Router } from 'express';
import { User, getAdminThemeSettings, setAdminThemeSettings, getUserThemeSettings } from '@smm/database';
import {
  ApiError,
  AUDIT_ACTIONS,
  ROLES,
  paginationSchema,
  updateAdminThemeSettingsSchema,
  type PanelTheme,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeUser } from '../../helpers/transform';

/**
 * Super-Admin control over each Main Admin's panel themes.
 *
 *  - theme:         the Admin Panel theme for that admin account.
 *  - enabledThemes: User Panel themes the admin may activate for their users.
 *  - defaultTheme:  User Panel theme new/unset tenants fall back to.
 *
 * Every change is audited (SUPER_ADMIN_CHANGED_ADMIN_THEME). This router is
 * mounted under the requireSuperAdmin() guard in the super-admin router.
 */
export function superAdminAdminThemesRouter(): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(paginationSchema),
    async (req: AuthedRequest, res) => {
      const q = res.locals.query as { page: number; limit: number; search?: string };
      const filter: Record<string, unknown> = {
        role: ROLES.ADMIN,
        parentAdminId: { $in: [null, undefined] },
      };
      if (q.search) {
        const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
      }
      const total = await User.countDocuments(filter);
      const admins = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean();
      const items = await Promise.all(
        admins.map(async (admin) => {
          const adminId = String(admin._id);
          const settings = await getAdminThemeSettings(adminId);
          const userPanel = await getUserThemeSettings(adminId);
          return {
            ...serializeUser(admin),
            adminTheme: settings,
            userPanel: { theme: userPanel.theme, allowUserOverride: userPanel.allowUserOverride },
          };
        }),
      );
      res.json({
        data: {
          items,
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.get('/:id', async (req: AuthedRequest, res) => {
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, parentAdminId: { $in: [null, undefined] } }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');
    const adminId = String(admin._id);
    const settings = await getAdminThemeSettings(adminId);
    const userPanel = await getUserThemeSettings(adminId);
    res.json({
      data: {
        admin: serializeUser(admin),
        adminTheme: settings,
        userPanel: { theme: userPanel.theme, allowUserOverride: userPanel.allowUserOverride },
      },
    });
  });

  router.patch('/:id', validateBody(updateAdminThemeSettingsSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { theme: PanelTheme; enabledThemes: PanelTheme[]; defaultTheme: PanelTheme };
    const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, parentAdminId: { $in: [null, undefined] } }).lean();
    if (!admin) throw ApiError.notFound('Admin not found.');

    const adminId = String(admin._id);
    const previous = await getAdminThemeSettings(adminId);
    await setAdminThemeSettings(adminId, body, req.ctx.user._id);

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.SUPER_ADMIN_CHANGED_ADMIN_THEME,
      targetType: 'admin',
      targetId: adminId,
      targetLabel: admin.email,
      ip: ipFrom(req),
      metadata: {
        previousTheme: previous.theme,
        newTheme: body.theme,
        previousEnabledThemes: previous.enabledThemes,
        newEnabledThemes: body.enabledThemes,
        previousDefaultTheme: previous.defaultTheme,
        newDefaultTheme: body.defaultTheme,
      },
    });

    const updated = await getAdminThemeSettings(adminId);
    res.json({ data: { adminId, adminTheme: updated } });
  });

  return router;
}