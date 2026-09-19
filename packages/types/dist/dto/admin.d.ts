import { z } from 'zod';
export declare const createAdminSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    licenseDurationDays: z.ZodNumber;
    maxUsers: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    licenseDurationDays: number;
    maxUsers: number;
}, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    licenseDurationDays: number;
    maxUsers?: number | undefined;
}>, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    licenseDurationDays: number;
    maxUsers: number;
}, {
    email: string;
    password: string;
    name: string;
    phone: string;
    confirmPassword: string;
    licenseDurationDays: number;
    maxUsers?: number | undefined;
}>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export declare const updateAdminStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["active", "suspended", "inactive"]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "suspended" | "inactive";
}, {
    status: "active" | "suspended" | "inactive";
}>;
export type UpdateAdminStatusInput = z.infer<typeof updateAdminStatusSchema>;
export declare const resetPasswordSchema: z.ZodEffects<z.ZodObject<{
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirmPassword: string;
    newPassword: string;
}, {
    confirmPassword: string;
    newPassword: string;
}>, {
    confirmPassword: string;
    newPassword: string;
}, {
    confirmPassword: string;
    newPassword: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export declare const updateUserStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["active", "suspended", "inactive"]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "suspended" | "inactive";
}, {
    status: "active" | "suspended" | "inactive";
}>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export declare const updateAdminSubdomainSchema: z.ZodObject<{
    action: z.ZodEnum<["disable", "enable", "regenerate"]>;
}, "strip", z.ZodTypeAny, {
    action: "disable" | "enable" | "regenerate";
}, {
    action: "disable" | "enable" | "regenerate";
}>;
export type UpdateAdminSubdomainInput = z.infer<typeof updateAdminSubdomainSchema>;
