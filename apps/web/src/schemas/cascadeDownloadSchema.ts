// src/schemas/cascadeDownloadSchema.ts
import { z } from 'zod';

export const cascadeDownloadSchema = z.object({
  address: z
    .string()
    .trim()
    .min(20, { message: 'Address is required' })
    .max(50, { message: 'Invalid address' }),

  action_id: z
    .string()
    .trim()
    .min(5, { message: 'Action ID is required' })
    .max(10, { message: 'Invalid action ID' }),

  file_type: z
    .string()
    .trim()
    .min(3, { message: 'File type is required' })
    .max(10, { message: 'Invalid file type' }),
});

export type TrackActionInput = z.infer<typeof cascadeDownloadSchema>;
