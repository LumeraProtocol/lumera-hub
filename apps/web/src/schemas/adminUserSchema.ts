// src/schemas/adminUserSchema.ts
import { z } from 'zod';

// Create new user
export const createAdminUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }).min(1, { message: 'Email is required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  fullName: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// Update user (all fields optional)
export const updateAdminUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  fullName: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Login
export const loginAdminUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }).min(1, { message: 'Email is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type LoginAdminUserInput = z.infer<typeof loginAdminUserSchema>;
