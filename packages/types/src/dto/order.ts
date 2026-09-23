import { z } from 'zod';

export const createOrderSchema = z.object({
  serviceId: z.string().trim().min(1, 'Service is required'),
  link: z.string().trim().min(4, 'Enter a valid link').max(2000),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10_000_000),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Engagement bundle order. Quantity and price are NEVER accepted from the
 * client — the server prices the order exclusively from the active bundle. */
export const createBundleOrderSchema = z.object({
  bundleId: z.string().trim().min(1, 'Bundle is required'),
  link: z.string().trim().min(4, 'Enter a valid link').max(2000),
});

export type CreateBundleOrderInput = z.infer<typeof createBundleOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(['processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed']),
  startCounter: z.number().int().min(0).optional(),
  remaining: z.number().int().min(0).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;