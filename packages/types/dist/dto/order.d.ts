import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    serviceId: z.ZodString;
    link: z.ZodString;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    serviceId: string;
    link: string;
}, {
    quantity: number;
    serviceId: string;
    link: string;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
/** Engagement bundle order. Quantity and price are NEVER accepted from the
 * client — the server prices the order exclusively from the active bundle. */
export declare const createBundleOrderSchema: z.ZodObject<{
    bundleId: z.ZodString;
    link: z.ZodString;
}, "strip", z.ZodTypeAny, {
    link: string;
    bundleId: string;
}, {
    link: string;
    bundleId: string;
}>;
export type CreateBundleOrderInput = z.infer<typeof createBundleOrderSchema>;
export declare const updateOrderStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["processing", "in_progress", "completed", "partial", "cancelled", "failed"]>;
    startCounter: z.ZodOptional<z.ZodNumber>;
    remaining: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "processing" | "in_progress" | "completed" | "partial" | "cancelled" | "failed";
    startCounter?: number | undefined;
    remaining?: number | undefined;
}, {
    status: "processing" | "in_progress" | "completed" | "partial" | "cancelled" | "failed";
    startCounter?: number | undefined;
    remaining?: number | undefined;
}>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
