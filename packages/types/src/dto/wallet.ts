import { z } from 'zod';

export const addFundsSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be greater than 0').max(1_000_000),
  paymentMethodId: z.string().trim().min(1, 'Select a payment method').optional(),
});

export type AddFundsInput = z.infer<typeof addFundsSchema>;

export const createPaymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_-]+$/, 'Code may only contain lowercase letters, numbers, dashes and underscores'),
  enabled: z.boolean().optional().default(true),
  instructions: z.string().trim().max(2000).optional().default(''),
  config: z.record(z.unknown()).optional().default({}),
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();

export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;