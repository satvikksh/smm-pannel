import { z } from 'zod';

export const createOrderSchema = z.object({
  serviceId: z.string().trim().min(1, 'Service is required'),
  link: z.string().trim().min(4, 'Enter a valid link').max(2000),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10_000_000),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(['processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed']),
  startCounter: z.number().int().min(0).optional(),
  remaining: z.number().int().min(0).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;