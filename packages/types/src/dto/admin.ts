import { z } from 'zod';
import { passwordSchema } from './common';

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
