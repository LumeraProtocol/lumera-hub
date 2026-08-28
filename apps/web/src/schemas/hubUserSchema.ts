// src/schemas/hubUserSchema.ts
import { z } from 'zod';

// Wallet-connect tracking must never be lost to a malformed optional field:
// referral links and referrers come from URLs and browser state the user does
// not control. Only the address itself is a hard requirement — the other
// fields are normalized instead of rejected.
const REFERRAL_CODE_MIN = 20;
const REFERRAL_CODE_MAX = 50;
const ACQUISITION_SOURCE_MAX = 20;

export const hubUserSchema = z.object({
  address: z
    .string()
    .trim()
    .min(20, { message: 'Address is required' })
    .max(50, { message: 'Invalid address' })
    // EVM addresses are case-insensitive. Canonicalizing them prevents the
    // same wallet from creating separate analytics rows when a provider
    // alternates between checksum and lowercase formatting.
    .transform((value) => /^0x/i.test(value) ? value.toLowerCase() : value),
  acquisitionSource: z
    .string()
    .trim()
    .optional()
    .default('')
    .transform((value) => value.slice(0, ACQUISITION_SOURCE_MAX)),
  referralCode: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      return trimmed.length >= REFERRAL_CODE_MIN && trimmed.length <= REFERRAL_CODE_MAX
        ? trimmed
        : null;
    }),
});

export type TrackActionInput = z.infer<typeof hubUserSchema>;
