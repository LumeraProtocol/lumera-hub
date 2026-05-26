// src/schemas/cascadeDownloadSchema.ts
import { z } from 'zod';

export const cascadeUploadSchema = z.object({
  lumeraAddress: z
    .string()
    .trim()
    .min(20, { message: 'Address is required' })
    .max(50, { message: 'Invalid address' }),

  taskId: z
    .string()
    .trim()
    .min(5, { message: 'taskId ID is required' })
    .max(10, { message: 'Invalid Task ID' }),
});

export type TrackActionInput = z.infer<typeof cascadeUploadSchema>;
