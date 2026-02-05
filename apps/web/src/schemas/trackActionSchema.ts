// src/schemas/trackActionSchema.ts
import { z } from 'zod';

export const trackActionSchema = z.object({
  wallet_address: z
    .string()
    .trim()
    .min(1, { message: 'Wallet address is required' })
    .max(50, { message: 'Invalid Wallet address' })
    .transform((val) => val.toLowerCase()),

  action_type: z
    .number()
    .int()
    .min(1, { message: 'Action type must be at least 1' })
    .max(17, { message: 'Action type must be between 1 and 17' }),

  timestamp: z
    .number()
    .int()
    .positive()
    .optional()
    .default(() => Math.floor(Date.now() / 1000)),

  tx_hash: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash' })
    .optional()
    .nullable(),

  task_id: z
    .string()
    .trim()
    .min(4, { message: 'Task id is required' })
    .max(20, { message: 'Invalid task id' })
    .optional()
    .nullable(),
});

export type TrackActionInput = z.infer<typeof trackActionSchema>;
