// src/schemas/hubTransactionSchema.ts
import { z } from 'zod';

export const hubTransactionSchema = z.object({
  hash: z
    .string()
    .trim()
    .min(20, { message: 'Hash is required' })
    .max(120, { message: 'Invalid hash' }),

  message_type: z
    .string()
    .trim()
    .min(20, { message: 'Message type is required' })
    .max(150, { message: 'Invalid message type' }),

  creator: z
    .string()
    .trim()
    .min(20, { message: 'Address is required' })
    .max(120, { message: 'Invalid address' }),

  price: z
    .number(),
});

export type TrackActionInput = z.infer<typeof hubTransactionSchema>;
