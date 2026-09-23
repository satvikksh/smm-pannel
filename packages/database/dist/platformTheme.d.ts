import type mongoose from 'mongoose';
import { type PanelTheme } from '@smm/types';
export declare function normalizePlatformTheme(value: unknown): PanelTheme;
/**
 * The global platform theme. Persisted in `PlatformSetting` under the
 * `platformTheme` key (not stored in any client cookie). Fallback is the
 * default panel theme.
 */
export declare function getPlatformTheme(): Promise<PanelTheme>;
export interface PlatformThemeMeta {
    theme: PanelTheme;
    updatedAt: string | null;
    updatedBy: string | null;
}
/** Theme plus audit metadata for the Appearance / Themes page. */
export declare function getPlatformThemeMeta(): Promise<PlatformThemeMeta>;
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
export declare function setPlatformTheme(theme: PanelTheme, updatedBy: mongoose.Types.ObjectId): Promise<PanelTheme>;
