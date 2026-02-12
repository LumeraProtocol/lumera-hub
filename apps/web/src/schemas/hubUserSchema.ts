// src/schemas/hubUserSchema.ts
import { z } from 'zod';

export const hubUserSchema = z.object({
  address: z
    .string()
    .trim()
    .min(20, { message: 'Address is required' })
    .max(50, { message: 'Invalid address' }),
});

export type TrackActionInput = z.infer<typeof hubUserSchema>;
