import type mongoose from 'mongoose';
import { DEFAULT_PANEL_THEME, type PanelTheme, type UserThemeResolution } from '@smm/types';
import { getAdminThemeSettings } from './models/adminThemeSettings';
import { getUserThemeSettings } from './models/userThemeSettings';
import { getUserThemePreference } from './models/userThemePreference';

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
export async function resolveUserPanelTheme(
  user: ThemeResolutionUser,
): Promise<UserThemeResolution> {
  const tenantAdminId = user.adminId ? String(user.adminId) : null;
  if (!tenantAdminId) {
    return {
      theme: DEFAULT_PANEL_THEME,
      allowUserOverride: false,
      overrideApplied: false,
      source: 'default',
      tenantAdminId: null,
    };
  }

  const adminConfig = await getAdminThemeSettings(tenantAdminId);
  const allowedThemes = new Set<PanelTheme>(adminConfig.enabledThemes);
  const tenant = await getUserThemeSettings(tenantAdminId);
  let theme: PanelTheme = allowedThemes.has(tenant.theme) ? tenant.theme : adminConfig.defaultTheme;
  let source: UserThemeResolution['source'] = 'tenant';
  let overrideApplied = false;

  if (tenant.allowUserOverride) {
    const pref = await getUserThemePreference(String(user._id));
    if (pref && allowedThemes.has(pref.theme)) {
      theme = pref.theme;
      source = 'override';
      overrideApplied = true;
    }
  }

  return {
    theme,
    allowUserOverride: tenant.allowUserOverride,
    overrideApplied,
    source,
    tenantAdminId,
  };
}

/**
 * The themes a tenant may actually use for their user panel, in canonical
 * order: the Super-Admin controlled `enabledThemes` plus the tenant default
 * (in case the default was configured while its theme was left disabled).
 */
export function tenantAllowedThemes(adminConfig: {
  enabledThemes: PanelTheme[];
  defaultTheme: PanelTheme;
}): PanelTheme[] {
  return [...new Set<PanelTheme>([...adminConfig.enabledThemes, adminConfig.defaultTheme])];
}