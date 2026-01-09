// @/app/api/supernode/validators.ts
import { z } from 'zod';

const supernodeItemSchema = z.object({
  supernode_account: z
    .string()
    .min(1, 'Supernode account cannot be empty')
    .regex(/^lumera1[a-z0-9]{38,39}$/, 'Supernode account must start with "lumera1" and be a valid Lumera address (38-39 hex characters)'),

  validator_address: z
    .string()
    .min(1, 'Validator address cannot be empty')
    .regex(/^lumeravaloper1[a-z0-9]{38,39}$/, 'Validator address must start with "lumeravaloper1" and be a valid Lumera address (38-39 hex characters)'),

  validator_moniker: z
    .string()
    .min(1, 'Validator moniker cannot be empty')
    .max(50, 'Validator moniker is too long (maximum 50 characters)'),

  p2p_port: z
    .number()
    .int('P2P port must be an integer')
    .min(1, 'P2P port must be greater than 0')
    .max(65535, 'P2P port must be less than 65535')
    .refine((val) => val === 4445, 'P2P port must be 4445'),

  ip_address: z
    .string()
    .min(1, 'IP address cannot be empty')
    .max(50, 'IP addres is too long (maximum 50 characters)'),
});

export const supernodeListSchema = z.array(supernodeItemSchema).min(1, 'Supernode list cannot be empty');

export type SupernodeItem = z.infer<typeof supernodeItemSchema>;
export type SupernodeList = z.infer<typeof supernodeListSchema>;
