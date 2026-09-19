import { z } from 'zod';
export declare const activateLicenseSchema: z.ZodObject<{
    licenseKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    licenseKey: string;
}, {
    licenseKey: string;
}>;
export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;
export declare const createLicenseSchema: z.ZodObject<{
    adminUserId: z.ZodString;
    durationDays: z.ZodNumber;
    maxUsers: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    metadata: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    maxUsers: number;
    adminUserId: string;
    durationDays: number;
    metadata: Record<string, unknown>;
}, {
    adminUserId: string;
    durationDays: number;
    maxUsers?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export declare const updateLicenseStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["active", "suspended", "revoked", "expired"]>;
    reason: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "suspended" | "revoked" | "expired";
    reason: string;
}, {
    status: "active" | "suspended" | "revoked" | "expired";
    reason?: string | undefined;
}>;
export type UpdateLicenseStatusInput = z.infer<typeof updateLicenseStatusSchema>;
export declare const renewLicenseSchema: z.ZodObject<{
    durationDays: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    durationDays: number;
}, {
    durationDays: number;
}>;
export type RenewLicenseInput = z.infer<typeof renewLicenseSchema>;
