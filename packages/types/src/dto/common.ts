import { z } from 'zod';

export const idSchema = z.string().trim().min(1, 'Required');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(''),
  sort: z.string().trim().max(50).optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');
