import { z } from 'zod';
import { paginationSchema, passwordSchema } from './common';

/**
 * The decision states of a self-registered admin application (the Super Admin
 * Requests page). A request that is approved is persisted as an `active`
 * account so the admin can sign in; the Requests UI surfaces that account as
 * `approved`. This shared constant keeps the frontend dropdown, the API query
 * filter and the backend validation in lock-step — the status filter and the
 * dropdown MUST use these exact string values.
 */
export const ADMIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type AdminRequestStatus = (typeof ADMIN_REQUEST_STATUSES)[number];

export const adminRequestsQuerySchema = paginationSchema.extend({
  status: z.enum(ADMIN_REQUEST_STATUSES).optional(),
});
export type AdminRequestsQuery = z.infer<typeof adminRequestsQuerySchema>;

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(120);
const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(25)
  .regex(/^[+]?[0-9 ()-]+$/, 'Enter a valid phone number');

export const createAdminSchema = z
  .object({
    name: nameSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm the password'),
    licenseDurationDays: z
      .number({ invalid_type_error: 'Select a license duration' })
      .int('Duration must be a whole number of days')
      .min(1, 'Duration must be at least 1 day')
      .max(3650, 'Duration cannot exceed 3650 days'),
    maxUsers: z.number().int().min(0).max(1_000_000).optional().default(0),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const updateAdminStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

export type UpdateAdminStatusInput = z.infer<typeof updateAdminStatusSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const updateAdminSubdomainSchema = z.object({
  action: z.enum(['disable', 'enable', 'regenerate'], {
    errorMap: () => ({ message: 'Select a subdomain action' }),
  }),
});

export type UpdateAdminSubdomainInput = z.infer<typeof updateAdminSubdomainSchema>;

/**
 * Approve a self-registered admin application. `licenseDurationDays` is optional:
 * when omitted the admin is approved WITHOUT a license (they cannot sign in until
 * a license is issued), when present a fresh active license is issued for the
 * tenant automatically.
 */
export const approveAdminRequestSchema = z
  .object({
    licenseDurationDays: z
      .number({ invalid_type_error: 'Select a license duration' })
      .int('Duration must be a whole number of days')
      .min(1, 'Duration must be at least 1 day')
      .max(3650, 'Duration cannot exceed 3650 days')
      .optional(),
    maxUsers: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((data) => (data.licenseDurationDays !== undefined) === (data.maxUsers !== undefined), {
    message: 'Max users must be set together with a license duration.',
    path: ['maxUsers'],
  });

export type ApproveAdminRequestInput = z.infer<typeof approveAdminRequestSchema>;

export const rejectAdminRequestSchema = z.object({
  reason: z.string().trim().min(1, 'Please provide a rejection reason').max(500, 'Reason is too long'),
});

export type RejectAdminRequestInput = z.infer<typeof rejectAdminRequestSchema>;
