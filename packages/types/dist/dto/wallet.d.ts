import { z } from 'zod';
export declare const addFundsSchema: z.ZodObject<{
    amount: z.ZodNumber;
    paymentMethodId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    paymentMethodId?: string | undefined;
}, {
    amount: number;
    paymentMethodId?: string | undefined;
}>;
export type AddFundsInput = z.infer<typeof addFundsSchema>;
export declare const createPaymentMethodSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    instructions: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    config: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    enabled: boolean;
    instructions: string;
    config: Record<string, unknown>;
}, {
    code: string;
    name: string;
    enabled?: boolean | undefined;
    instructions?: string | undefined;
    config?: Record<string, unknown> | undefined;
}>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export declare const updatePaymentMethodSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    instructions: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    config: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
    enabled?: boolean | undefined;
    instructions?: string | undefined;
    config?: Record<string, unknown> | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    enabled?: boolean | undefined;
    instructions?: string | undefined;
    config?: Record<string, unknown> | undefined;
}>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
