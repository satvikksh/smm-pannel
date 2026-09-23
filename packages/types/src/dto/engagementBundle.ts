import { z } from 'zod';
import { paginationSchema } from './common';

/** Engagement categories a bundle can target. */
export const ENGAGEMENT_BUNDLE_TYPES = ['likes', 'views', 'subscribers'] as const;
export type EngagementBundleType = (typeof ENGAGEMENT_BUNDLE_TYPES)[number];

export const ENGAGEMENT_BUNDLE_STATUSES = ['active', 'inactive'] as const;
export type EngagementBundleStatus = (typeof ENGAGEMENT_BUNDLE_STATUSES)[number];

export const ENGAGEMENT_BUNDLE_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type EngagementBundleCurrency = (typeof ENGAGEMENT_BUNDLE_CURRENCIES)[number];

export const ENGAGEMENT_BUNDLE_TYPE_LABELS: Record<EngagementBundleType, string> = {
  likes: 'Likes',
  views: 'Views',
  subscribers: 'Subscribers',
};

/** Max 2 decimal places. Guard rails prevent floating-point drift on the wire. */
const priceField = z
  .number()
  .min(0, 'Price must be greater than or equal to 0')
  .max(1_000_000, 'Price is too large')
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, {
    message: 'Price must not have more than 2 decimal places',
  });

const displayNameField = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters')
  .max(150);

const quantityField = z
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(10_000_000, 'Quantity is too large');

export const createEngagementBundleSchema = z.object({
  type: z.enum(ENGAGEMENT_BUNDLE_TYPES, {
    message: 'Select a valid engagement type',
  }),
  quantity: quantityField,
  price: priceField,
  currency: z.enum(ENGAGEMENT_BUNDLE_CURRENCIES).optional().default('INR'),
  displayName: displayNameField,
  description: z.string().trim().max(600).optional().default(''),
  status: z.enum(ENGAGEMENT_BUNDLE_STATUSES).optional().default('active'),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

export type CreateEngagementBundleInput = z.infer<typeof createEngagementBundleSchema>;

export const updateEngagementBundleSchema = z
  .object({
    type: z.enum(ENGAGEMENT_BUNDLE_TYPES),
    quantity: quantityField,
    price: priceField,
    currency: z.enum(ENGAGEMENT_BUNDLE_CURRENCIES),
    displayName: displayNameField,
    description: z.string().trim().max(600),
    status: z.enum(ENGAGEMENT_BUNDLE_STATUSES),
    sortOrder: z.number().int().min(0).max(9999),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateEngagementBundleInput = z.infer<typeof updateEngagementBundleSchema>;

export const updateEngagementBundleStatusSchema = z.object({
  status: z.enum(ENGAGEMENT_BUNDLE_STATUSES),
});

export type UpdateEngagementBundleStatusInput = z.infer<typeof updateEngagementBundleStatusSchema>;

export const engagementBundlesQuerySchema = paginationSchema.extend({
  type: z.enum(ENGAGEMENT_BUNDLE_TYPES).optional(),
  status: z.enum(ENGAGEMENT_BUNDLE_STATUSES).optional(),
});

export type EngagementBundlesQuery = z.infer<typeof engagementBundlesQuerySchema>;