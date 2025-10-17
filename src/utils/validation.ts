import { z } from 'zod';

// Authentication validation schemas
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(128, { message: 'Password must be less than 128 characters' })
});

export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(128, { message: 'Password must be less than 128 characters' }),
  confirmPassword: z.string(),
  fullName: z.string()
    .trim()
    .min(1, { message: 'Full name is required' })
    .max(100, { message: 'Full name must be less than 100 characters' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Full name can only contain letters, spaces, hyphens, and apostrophes' }),
  userType: z.enum(['student', 'department_admin']),
  enrollmentNo: z.string()
    .trim()
    .optional()
    .refine((val) => !val || /^[A-Z0-9-]+$/.test(val), {
      message: 'Enrollment number can only contain uppercase letters, numbers, and hyphens'
    }),
  deptId: z.string().uuid().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Admin login validation
export const adminLoginSchema = z.object({
  username: z.string()
    .trim()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(50, { message: 'Username must be less than 50 characters' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' }),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(128, { message: 'Password must be less than 128 characters' })
});

// Profile update validation
export const profileUpdateSchema = z.object({
  full_name: z.string()
    .trim()
    .min(1, { message: 'Full name is required' })
    .max(100, { message: 'Full name must be less than 100 characters' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Full name can only contain letters, spaces, hyphens, and apostrophes' })
    .optional(),
  contact_no: z.string()
    .trim()
    .regex(/^\+?[0-9\s-()]+$/, { message: 'Invalid phone number format' })
    .max(20, { message: 'Phone number must be less than 20 characters' })
    .optional(),
  address: z.string()
    .trim()
    .max(500, { message: 'Address must be less than 500 characters' })
    .optional(),
  student_enrollment_no: z.string()
    .trim()
    .regex(/^[A-Z0-9-]+$/, { message: 'Enrollment number can only contain uppercase letters, numbers, and hyphens' })
    .max(50, { message: 'Enrollment number must be less than 50 characters' })
    .optional(),
  semester: z.number()
    .int()
    .min(1)
    .max(8)
    .optional(),
  abc_id: z.string()
    .trim()
    .max(50)
    .optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
