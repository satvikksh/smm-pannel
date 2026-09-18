import { z } from 'zod';
import { ADMIN_SCOPES } from '../roles';
import { PANEL_THEMES } from '../user-panel-theme';

export const updateSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(80).optional(),
  youtubeLink: z.string().trim().max(2000).optional(),
  telegramLink: z.string().trim().max(2000).optional(),
  supportEmail: z.string().trim().toLowerCase().email().optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  minDeposit: z.number().min(0).max(1_000_000).optional(),
  registrationEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const upsertSettingSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.unknown(),
});

export type UpsertSettingInput = z.infer<typeof upsertSettingSchema>;

/**
 * Admin-owned User Panel theme settings for one tenant. Only the three known
 * theme IDs are accepted — no CSS, HTML, or arbitrary strings.
 */
export const updateUserThemeSettingsSchema = z.object({
  theme: z.enum(PANEL_THEMES, {
    errorMap: () => ({ message: 'Select a valid theme' }),
  }),
  allowUserOverride: z.boolean(),
});

export type UpdateUserThemeSettingsInput = z.infer<typeof updateUserThemeSettingsSchema>;

/**
 * Per-user theme override, written by a Sub Admin (manageUserTheme) for
 * assigned users or by a user themselves when overrides are enabled.
 */
export const updateUserThemeOverrideSchema = z.object({
  userId: z.string().trim().min(1, 'Select a user'),
  theme: z.enum(PANEL_THEMES, {
    errorMap: () => ({ message: 'Select a valid theme' }),
  }),
});

export type UpdateUserThemeOverrideInput = z.infer<typeof updateUserThemeOverrideSchema>;

/** Self-served user override (theme only; the user is read from the session). */
export const updateOwnThemeOverrideSchema = z.object({
  theme: z.enum(PANEL_THEMES, {
    errorMap: () => ({ message: 'Select a valid theme' }),
  }),
});

export type UpdateOwnThemeOverrideInput = z.infer<typeof updateOwnThemeOverrideSchema>;

/**
 * Super-Admin controlled Admin Panel theme + User Panel theme constraints for
 * one admin tenant.
 */
export const updateAdminThemeSettingsSchema = z.object({
  theme: z.enum(PANEL_THEMES, {
    errorMap: () => ({ message: 'Select a valid theme' }),
  }),
  enabledThemes: z
    .array(z.enum(PANEL_THEMES))
    .min(1, 'At least one theme must be enabled')
    .refine((themes) => new Set(themes).size === themes.length, {
      message: 'Themes must be unique',
    }),
  defaultTheme: z.enum(PANEL_THEMES, {
    errorMap: () => ({ message: 'Select a valid theme' }),
  }),
});

export type UpdateAdminThemeSettingsInput = z.infer<typeof updateAdminThemeSettingsSchema>;

/** Main Admin creates a Sub Admin under their tenant. */
export const createSubAdminSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .min(6, 'Enter a valid phone number')
      .max(25)
      .regex(/^[+]?[0-9 ()-]+$/, 'Enter a valid phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
    adminScopes: z.array(z.enum([ADMIN_SCOPES.MANAGE_USERS, ADMIN_SCOPES.MANAGE_USER_THEME, ADMIN_SCOPES.VIEW_USERS, ADMIN_SCOPES.VIEW_ORDERS])).max(4),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CreateSubAdminInput = z.infer<typeof createSubAdminSchema>;

/** Main Admin updates a Sub Admin's permissions. */
export const updateSubAdminSchema = z.object({
  adminScopes: z.array(
    z.enum([ADMIN_SCOPES.MANAGE_USERS, ADMIN_SCOPES.MANAGE_USER_THEME, ADMIN_SCOPES.VIEW_USERS, ADMIN_SCOPES.VIEW_ORDERS]),
  ).max(4),
});

export type UpdateSubAdminInput = z.infer<typeof updateSubAdminSchema>;

/** Admin claims an existing platform user into their tenant. */
export const claimUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export type ClaimUserInput = z.infer<typeof claimUserSchema>;

/** Main Admin / Sub Admin with the manageUsers scope creates a tenant user. */
export const createTenantUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .min(6, 'Enter a valid phone number')
      .max(25)
      .regex(/^[+]?[0-9 ()-]+$/, 'Enter a valid phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CreateTenantUserInput = z.infer<typeof createTenantUserSchema>;