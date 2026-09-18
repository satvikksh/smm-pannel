import { z } from 'zod';
import { passwordSchema } from './common';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Admin login additionally requires the license key assigned to the admin. The
 * key is validated server-side together with the credentials, role and license
 * state, so an admin session cannot be created without a valid, active license.
 */
export const adminLoginSchema = loginSchema.extend({
  // Length is validated here; presence is enforced by the login service so a
  // missing key surfaces the same LICENSE_INVALID error as an invalid one.
  licenseKey: z.string().trim().max(64, 'License key is too long').optional().default(''),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(120);
const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(25)
  .regex(/^[+]?[0-9 ()-]+$/, 'Enter a valid phone number');

export const registerSchema = z
  .object({
    name: nameSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
