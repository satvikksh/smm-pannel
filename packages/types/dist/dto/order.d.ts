import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    serviceId: z.ZodString;
    link: z.ZodString;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    serviceId: string;
    link: string;
    quantity: number;
}, {
    serviceId: string;
    link: string;
    quantity: number;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
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
