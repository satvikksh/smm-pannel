import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
/**
 * Admin login additionally requires the license key assigned to the admin. The
 * key is validated server-side together with the credentials, role and license
 * state, so an admin session cannot be created without a valid, active license.
 */
export declare const adminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
} & {
    licenseKey: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    licenseKey: string;
}, {
    email: string;
    password: string;
    licenseKey?: string | undefined;
}>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
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
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    phone?: string | undefined;
}, {
    name?: string | undefined;
    phone?: string | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const changePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
}, {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
}>, {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
}, {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
