import type mongoose from 'mongoose';
import { type PanelTheme, type UserThemeResolution } from '@smm/types';
export interface ThemeResolutionUser {
    _id: mongoose.Types.ObjectId | string;
    adminId?: mongoose.Types.ObjectId | string | null;
}
/**
 * Compute the effective User Panel theme for a user, entirely server-side:
 *
 *   1. No owning admin (`adminId` unset) → platform default (Modern Light).
 *   2. Tenant theme from the owning Main Admin's `UserThemeSettings`.
 *   3. If overrides are enabled AND the tenant allows the theme AND the user has
 *      a stored `UserThemePreference`, that preference wins.
 *
 * The result is never trusted from the client; `overrideApplied` tells the UI
 * whether a personal override is in effect.
 */
export declare function resolveUserPanelTheme(user: ThemeResolutionUser): Promise<UserThemeResolution>;
/**
 * The themes a tenant may actually use for their user panel, in canonical
 * order: the Super-Admin controlled `enabledThemes` plus the tenant default
 * (in case the default was configured while its theme was left disabled).
 */
export declare function tenantAllowedThemes(adminConfig: {
    enabledThemes: PanelTheme[];
    defaultTheme: PanelTheme;
}): PanelTheme[];
