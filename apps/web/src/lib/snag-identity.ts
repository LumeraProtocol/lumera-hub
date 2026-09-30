// src/lib/snag-identity.ts

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { LUMERA_ADDRESS, SNAG_ADDRESS } from '@/schemas/snagUserSchema';

/*
 * The SNAG account behind a hub wallet.
 *
 * A MetaMask (0x) wallet is a SNAG account in its own right. A Keplr (lumera1)
 * wallet is either linked to an existing SNAG profile (the SnagUser table,
 * written by /api/snag/save-user) or is its own SNAG account, connected as a
 * Cosmos wallet when the reader completes "Connect wallet to Lumera Hub" here.
 */

export type SnagWho = { walletAddress: string } | { userId: string };

/** SNAG keeps EVM addresses in lowercase and rejects other spellings of them. */
export const snagWalletAddress = (wallet: string) => (SNAG_ADDRESS.test(wallet) ? wallet.toLowerCase() : wallet);

export async function snagIdentity(wallet: string): Promise<SnagWho | null> {
  if (SNAG_ADDRESS.test(wallet)) return { walletAddress: snagWalletAddress(wallet) };
  if (!LUMERA_ADDRESS.test(wallet)) return null;

  try {
    const dataSource = await getDataSource();
    const link = await dataSource.getRepository(SnagUser).findOne({ where: { lumeraAddress: wallet } });
    if (link?.userId) return { userId: link.userId };
    if (link?.snagAddress) return { walletAddress: link.snagAddress };
  } catch (error) {
    // No database on this deployment: fall back to the wallet's own account.
    console.error('Snag link lookup failed:', error);
  }
  return { walletAddress: wallet };
}
