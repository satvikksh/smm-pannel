import { z } from 'zod';
export declare const updateSettingsSchema: z.ZodObject<{
    siteName: z.ZodOptional<z.ZodString>;
    youtubeLink: z.ZodOptional<z.ZodString>;
    telegramLink: z.ZodOptional<z.ZodString>;
    supportEmail: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
    minDeposit: z.ZodOptional<z.ZodNumber>;
    registrationEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    currency?: string | undefined;
    siteName?: string | undefined;
    youtubeLink?: string | undefined;
    telegramLink?: string | undefined;
    supportEmail?: string | undefined;
    minDeposit?: number | undefined;
    registrationEnabled?: boolean | undefined;
}, {
    currency?: string | undefined;
    siteName?: string | undefined;
    youtubeLink?: string | undefined;
    telegramLink?: string | undefined;
    supportEmail?: string | undefined;
    minDeposit?: number | undefined;
    registrationEnabled?: boolean | undefined;
}>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export declare const upsertSettingSchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    key: string;
    value?: unknown;
}, {
    key: string;
    value?: unknown;
}>;
export type UpsertSettingInput = z.infer<typeof upsertSettingSchema>;
/**
 * Admin-owned User Panel theme settings for one tenant. Only the three known
 * theme IDs are accepted — no CSS, HTML, or arbitrary strings.
 */
export declare const updateUserThemeSettingsSchema: z.ZodObject<{
    theme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
    allowUserOverride: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
    allowUserOverride: boolean;
}, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
    allowUserOverride: boolean;
}>;
export type UpdateUserThemeSettingsInput = z.infer<typeof updateUserThemeSettingsSchema>;
/**
 * Per-user theme override, written by a Sub Admin (manageUserTheme) for
 * assigned users or by a user themselves when overrides are enabled.
 */
export declare const updateUserThemeOverrideSchema: z.ZodObject<{
    userId: z.ZodString;
    theme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
}, "strip", z.ZodTypeAny, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
    userId: string;
}, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
    userId: string;
}>;
export type UpdateUserThemeOverrideInput = z.infer<typeof updateUserThemeOverrideSchema>;
/** Self-served user override (theme only; the user is read from the session). */
export declare const updateOwnThemeOverrideSchema: z.ZodObject<{
    theme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
}, "strip", z.ZodTypeAny, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}>;
export type UpdateOwnThemeOverrideInput = z.infer<typeof updateOwnThemeOverrideSchema>;
/**
 * Super-Admin controlled Admin Panel theme + User Panel theme constraints for
 * one admin tenant.
 */
export declare const updateAdminThemeSettingsSchema: z.ZodObject<{
    theme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
    enabledThemes: z.ZodEffects<z.ZodArray<z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>, "many">, ("modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora")[], ("modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora")[]>;
    defaultTheme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
}, "strip", z.ZodTypeAny, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
    enabledThemes: ("modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora")[];
    defaultTheme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
    enabledThemes: ("modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora")[];
    defaultTheme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}>;
export type UpdateAdminThemeSettingsInput = z.infer<typeof updateAdminThemeSettingsSchema>;
/**
 * Global platform theme selected by the Super Admin on the Appearance page.
 * The selection is rolled out as the default for every admin panel and every
 * tenant's user panel.
 */
export declare const updatePlatformThemeSchema: z.ZodObject<{
    theme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
}, "strip", z.ZodTypeAny, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}>;
export type UpdatePlatformThemeInput = z.infer<typeof updatePlatformThemeSchema>;
/** Main Admin picks the theme for their own Admin Panel (enabled set enforced server-side). */
export declare const updateAdminPanelThemeSchema: z.ZodObject<{
    theme: z.ZodEnum<["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"]>;
}, "strip", z.ZodTypeAny, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}, {
    theme: "modern-light" | "modern-dark" | "premium-gradient" | "vibrant-neon" | "sunset-tropical" | "ocean-aurora";
}>;
export type UpdateAdminPanelThemeInput = z.infer<typeof updateAdminPanelThemeSchema>;
/** Main Admin creates a Sub Admin under their tenant. */
export declare const createSubAdminSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    adminScopes: z.ZodArray<z.ZodEnum<["manageUsers", "manageUserTheme", "viewUsers", "viewOrders"]>, "many">;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    adminScopes: ("manageUsers" | "manageUserTheme" | "viewUsers" | "viewOrders")[];
}, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    adminScopes: ("manageUsers" | "manageUserTheme" | "viewUsers" | "viewOrders")[];
}>, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    adminScopes: ("manageUsers" | "manageUserTheme" | "viewUsers" | "viewOrders")[];
}, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    adminScopes: ("manageUsers" | "manageUserTheme" | "viewUsers" | "viewOrders")[];
}>;
export type CreateSubAdminInput = z.infer<typeof createSubAdminSchema>;
/** Main Admin updates a Sub Admin's permissions. */
export declare const updateSubAdminSchema: z.ZodObject<{
    adminScopes: z.ZodArray<z.ZodEnum<["manageUsers", "manageUserTheme", "viewUsers", "viewOrders"]>, "many">;
}, "strip", z.ZodTypeAny, {
    adminScopes: ("manageUsers" | "manageUserTheme" | "viewUsers" | "viewOrders")[];
}, {
    adminScopes: ("manageUsers" | "manageUserTheme" | "viewUsers" | "viewOrders")[];
}>;
export type UpdateSubAdminInput = z.infer<typeof updateSubAdminSchema>;
/** Admin claims an existing platform user into their tenant. */
export declare const claimUserSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ClaimUserInput = z.infer<typeof claimUserSchema>;
/** Main Admin / Sub Admin with the manageUsers scope creates a tenant user. */
export declare const createTenantUserSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
}, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
}>, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
}, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
}>;
export type CreateTenantUserInput = z.infer<typeof createTenantUserSchema>;
