// src/schemas/snagUserSchema.ts
import { z } from 'zod';

/** A SNAG profile is an EVM account. */
export const SNAG_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
export const LUMERA_ADDRESS = /^lumera1[0-9a-z]{38,45}$/;

export const snagUserSchema = z.object({
  snagAddress: z
    .string()
    .trim()
    .regex(SNAG_ADDRESS, { message: 'Invalid Snag address' }),

  lumeraAddress: z
    .string()
    .trim()
    .regex(LUMERA_ADDRESS, { message: 'Invalid Lumera address' }),
});

export type SnagUserInput = z.infer<typeof snagUserSchema>;
