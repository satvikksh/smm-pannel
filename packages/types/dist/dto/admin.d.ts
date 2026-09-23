import { z } from 'zod';
/**
 * The decision states of a self-registered admin application (the Super Admin
 * Requests page). A request that is approved is persisted as an `active`
 * account so the admin can sign in; the Requests UI surfaces that account as
 * `approved`. This shared constant keeps the frontend dropdown, the API query
 * filter and the backend validation in lock-step — the status filter and the
 * dropdown MUST use these exact string values.
 */
export declare const ADMIN_REQUEST_STATUSES: readonly ["pending", "approved", "rejected"];
export type AdminRequestStatus = (typeof ADMIN_REQUEST_STATUSES)[number];
export declare const adminRequestsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sort: z.ZodOptional<z.ZodString>;
} & {
    status: z.ZodOptional<z.ZodEnum<["pending", "approved", "rejected"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search: string;
    sort?: string | undefined;
    status?: "pending" | "rejected" | "approved" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sort?: string | undefined;
    status?: "pending" | "rejected" | "approved" | undefined;
}>;
export type AdminRequestsQuery = z.infer<typeof adminRequestsQuerySchema>;
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
/**
 * Approve a self-registered admin application. `licenseDurationDays` is optional:
 * when omitted the admin is approved WITHOUT a license (they cannot sign in until
 * a license is issued), when present a fresh active license is issued for the
 * tenant automatically.
 */
export declare const approveAdminRequestSchema: z.ZodEffects<z.ZodObject<{
    licenseDurationDays: z.ZodOptional<z.ZodNumber>;
    maxUsers: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    licenseDurationDays?: number | undefined;
    maxUsers?: number | undefined;
}, {
    licenseDurationDays?: number | undefined;
    maxUsers?: number | undefined;
}>, {
    licenseDurationDays?: number | undefined;
    maxUsers?: number | undefined;
}, {
    licenseDurationDays?: number | undefined;
    maxUsers?: number | undefined;
}>;
export type ApproveAdminRequestInput = z.infer<typeof approveAdminRequestSchema>;
export declare const rejectAdminRequestSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type RejectAdminRequestInput = z.infer<typeof rejectAdminRequestSchema>;
