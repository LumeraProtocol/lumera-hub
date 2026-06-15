// src/schemas/snagResponseSchema.ts
import { z } from 'zod';

export const snagResponseSchema = z.object({
  id: z
    .number(),

  adminUserId: z
    .number(),

  userId: z
    .string()
    .trim()
    .min(20, { message: 'Hash is required' })
    .max(150, { message: 'Invalid hash' }),

  loyaltyRuleId: z
    .string()
    .trim()
    .min(10, { message: 'loyaltyRuleId is required' })
    .max(50, { message: 'Invalid loyaltyRule id' }),

  type: z
    .string()
    .trim()
    .min(3, { message: 'Type is required' })
    .max(25, { message: 'Invalid type' }),
});

export type TrackActionInput = z.infer<typeof snagResponseSchema>;
