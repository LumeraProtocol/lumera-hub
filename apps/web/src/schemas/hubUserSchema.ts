// src/schemas/hubUserSchema.ts
import { z } from 'zod';

export const hubUserSchema = z.object({
  address: z
    .string()
    .trim()
    .min(20, { message: 'Address is required' })
    .max(50, { message: 'Invalid address' }),
  acquisitionSource: z
    .string()
    .trim()
    .max(20, { message: 'Invalid acquisitionSource' }),
  referralCode: z
    .string()
    .trim()
    .min(20, { message: 'Invalid referralCode' })
    .max(50, { message: 'Invalid referralCode' })
    .nullable()
    .optional(),
});

export type TrackActionInput = z.infer<typeof hubUserSchema>;
