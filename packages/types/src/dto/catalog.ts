import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  icon: z.string().trim().max(60).optional().default('grid'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createServiceSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
    categoryId: z.string().trim().min(1, 'Category is required'),
    description: z.string().trim().max(2000).optional().default(''),
    price: z.number().positive('Price must be greater than 0'),
    minOrder: z.number().int().min(1, 'Minimum order must be at least 1'),
    maxOrder: z.number().int().min(1, 'Maximum order must be at least 1'),
    status: z.enum(['active', 'inactive']).optional().default('active'),
  })
  .refine((data) => data.maxOrder >= data.minOrder, {
    message: 'Maximum order must be greater than or equal to minimum order',
    path: ['maxOrder'],
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    categoryId: z.string().trim().min(1).optional(),
    description: z.string().trim().max(2000).optional(),
    price: z.number().positive().optional(),
    minOrder: z.number().int().min(1).optional(),
    maxOrder: z.number().int().min(1).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
