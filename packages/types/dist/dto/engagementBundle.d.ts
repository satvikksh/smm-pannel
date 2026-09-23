import { z } from 'zod';
/** Engagement categories a bundle can target. */
export declare const ENGAGEMENT_BUNDLE_TYPES: readonly ["likes", "views", "subscribers"];
export type EngagementBundleType = (typeof ENGAGEMENT_BUNDLE_TYPES)[number];
export declare const ENGAGEMENT_BUNDLE_STATUSES: readonly ["active", "inactive"];
export type EngagementBundleStatus = (typeof ENGAGEMENT_BUNDLE_STATUSES)[number];
export declare const ENGAGEMENT_BUNDLE_CURRENCIES: readonly ["INR", "USD", "EUR", "GBP"];
export type EngagementBundleCurrency = (typeof ENGAGEMENT_BUNDLE_CURRENCIES)[number];
export declare const ENGAGEMENT_BUNDLE_TYPE_LABELS: Record<EngagementBundleType, string>;
export declare const createEngagementBundleSchema: z.ZodObject<{
    type: z.ZodEnum<["likes", "views", "subscribers"]>;
    quantity: z.ZodNumber;
    price: z.ZodEffects<z.ZodNumber, number, number>;
    currency: z.ZodDefault<z.ZodOptional<z.ZodEnum<["INR", "USD", "EUR", "GBP"]>>>;
    displayName: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "inactive"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "likes" | "views" | "subscribers";
    status: "active" | "inactive";
    quantity: number;
    price: number;
    currency: "INR" | "USD" | "EUR" | "GBP";
    displayName: string;
    description: string;
    sortOrder: number;
}, {
    type: "likes" | "views" | "subscribers";
    quantity: number;
    price: number;
    displayName: string;
    status?: "active" | "inactive" | undefined;
    currency?: "INR" | "USD" | "EUR" | "GBP" | undefined;
    description?: string | undefined;
    sortOrder?: number | undefined;
}>;
export type CreateEngagementBundleInput = z.infer<typeof createEngagementBundleSchema>;
export declare const updateEngagementBundleSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["likes", "views", "subscribers"]>>;
    quantity: z.ZodOptional<z.ZodNumber>;
    price: z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>;
    currency: z.ZodOptional<z.ZodEnum<["INR", "USD", "EUR", "GBP"]>>;
    displayName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "likes" | "views" | "subscribers" | undefined;
    status?: "active" | "inactive" | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    currency?: "INR" | "USD" | "EUR" | "GBP" | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    sortOrder?: number | undefined;
}, {
    type?: "likes" | "views" | "subscribers" | undefined;
    status?: "active" | "inactive" | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    currency?: "INR" | "USD" | "EUR" | "GBP" | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    sortOrder?: number | undefined;
}>, {
    type?: "likes" | "views" | "subscribers" | undefined;
    status?: "active" | "inactive" | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    currency?: "INR" | "USD" | "EUR" | "GBP" | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    sortOrder?: number | undefined;
}, {
    type?: "likes" | "views" | "subscribers" | undefined;
    status?: "active" | "inactive" | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    currency?: "INR" | "USD" | "EUR" | "GBP" | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    sortOrder?: number | undefined;
}>;
export type UpdateEngagementBundleInput = z.infer<typeof updateEngagementBundleSchema>;
export declare const updateEngagementBundleStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["active", "inactive"]>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive";
}, {
    status: "active" | "inactive";
}>;
export type UpdateEngagementBundleStatusInput = z.infer<typeof updateEngagementBundleStatusSchema>;
export declare const engagementBundlesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sort: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodOptional<z.ZodEnum<["likes", "views", "subscribers"]>>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search: string;
    sort?: string | undefined;
    type?: "likes" | "views" | "subscribers" | undefined;
    status?: "active" | "inactive" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sort?: string | undefined;
    type?: "likes" | "views" | "subscribers" | undefined;
    status?: "active" | "inactive" | undefined;
}>;
export type EngagementBundlesQuery = z.infer<typeof engagementBundlesQuerySchema>;
