// src/schemas/snagUserSchema.ts
import { z } from 'zod';

export const snagUserSchema = z.object({
  snagAddress: z
    .string()
    .trim()
    .min(40, { message: 'Snag Address is required' })
    .max(50, { message: 'Invalid Snag Address' }),

  lumeraAddress: z
    .string()
    .trim()
    .min(40, { message: 'Lumera Address is required' })
    .max(50, { message: 'Invalid Lumera Address' }),
});

export type SnagUserInput = z.infer<typeof snagUserSchema>;
