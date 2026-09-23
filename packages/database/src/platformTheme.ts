import type mongoose from 'mongoose';
import {
  DEFAULT_PANEL_THEME,
  ROLES,
  isPanelTheme,
  type PanelTheme,
} from '@smm/types';
import PlatformSetting from './models/platformSetting';
import AdminThemeSettings from './models/adminThemeSettings';
import UserThemeSettings from './models/userThemeSettings';
import User from './models/user';

const PLATFORM_THEME_KEY = 'platformTheme';

export function normalizePlatformTheme(value: unknown): PanelTheme {
  return isPanelTheme(value) ? value : DEFAULT_PANEL_THEME;
}

/**
 * The global platform theme. Persisted in `PlatformSetting` under the
 * `platformTheme` key (not stored in any client cookie). Fallback is the
 * default panel theme.
 */
export async function getPlatformTheme(): Promise<PanelTheme> {
  const doc = await PlatformSetting.findOne({ key: PLATFORM_THEME_KEY }).lean();
  return normalizePlatformTheme(doc?.value);
}

export interface PlatformThemeMeta {
  theme: PanelTheme;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Theme plus audit metadata for the Appearance / Themes page. */
export async function getPlatformThemeMeta(): Promise<PlatformThemeMeta> {
  const doc = await PlatformSetting.findOne({ key: PLATFORM_THEME_KEY }).lean();
  return {
    theme: normalizePlatformTheme(doc?.value),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    updatedBy: doc?.updatedBy ? String(doc.updatedBy) : null,
  };
}

/**
 * Persist the platform theme and roll it out as the default for every Main
 * Admin tenant:
 *
 *  - Admin Panel theme (`AdminThemeSettings.theme`) — Super Admin and all
 *    admins see this selection in their own panels.
 *  - User Panel tenant default (`UserThemeSettings.theme`) — every user gets
 *    the platform theme unless the tenant admin or the user chose a personal
 *    override afterwards (both existing features stay intact).
 *
 * `enabledThemes`, `defaultTheme` and `allowUserOverride` are never touched by
 * the rollout.
 */
export async function setPlatformTheme(
  theme: PanelTheme,
  updatedBy: mongoose.Types.ObjectId,
): Promise<PanelTheme> {
  await PlatformSetting.updateOne(
    { key: PLATFORM_THEME_KEY },
    { $set: { value: theme, updatedBy } },
    { upsert: true },
  );

  const admins = await User.find({ role: ROLES.ADMIN, parentAdminId: { $in: [null, undefined] } })
    .select('_id')
    .lean();
  await Promise.all(
    admins.map(async (admin) => {
      const adminId = String(admin._id);
      await Promise.all([
        AdminThemeSettings.findByIdAndUpdate(
          adminId,
          { $set: { theme, updatedBy } },
          { upsert: true, new: true },
        ),
        UserThemeSettings.findByIdAndUpdate(
          adminId,
          { $set: { theme, updatedBy } },
          { upsert: true, new: true },
        ),
      ]);
    }),
  );

  return theme;
}