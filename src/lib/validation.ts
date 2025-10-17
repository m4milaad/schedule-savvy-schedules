import { z } from 'zod';

// Auth validation schemas
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Full name is required')
  .max(100, 'Full name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes');

export const enrollmentNumberSchema = z
  .string()
  .trim()
  .min(1, 'Enrollment number is required')
  .max(50, 'Enrollment number must be less than 50 characters')
  .regex(/^[a-zA-Z0-9-]+$/, 'Enrollment number can only contain letters, numbers, and hyphens');

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Sign up validation schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  userType: z.enum(['student', 'department_admin']),
  enrollmentNumber: enrollmentNumberSchema.optional(),
  deptId: z.string().uuid('Invalid department ID').optional(),
});

// Sign in validation schema
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Admin login validation schema
export const adminLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  full_name: fullNameSchema.optional(),
  contact_no: z.string().trim().max(20, 'Contact number must be less than 20 characters').optional(),
  address: z.string().trim().max(500, 'Address must be less than 500 characters').optional(),
  semester: z.number().int().min(1).max(12).optional(),
  abc_id: z.string().trim().max(50, 'ABC ID must be less than 50 characters').optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
