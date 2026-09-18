import { z } from 'zod';

export const activateLicenseSchema = z.object({
  licenseKey: z.string().trim().min(1, 'License key is required').max(64),
});

export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;

export const createLicenseSchema = z.object({
  adminUserId: z.string().trim().min(1, 'Admin is required'),
  durationDays: z.number().int().min(1).max(3650),
  maxUsers: z.number().int().min(0).max(1_000_000).optional().default(0),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;

export const updateLicenseStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'revoked', 'expired']),
  reason: z.string().trim().max(500).optional().default(''),
});

export type UpdateLicenseStatusInput = z.infer<typeof updateLicenseStatusSchema>;

export const renewLicenseSchema = z.object({
  durationDays: z.number().int().min(1).max(3650),
});

export type RenewLicenseInput = z.infer<typeof renewLicenseSchema>;
