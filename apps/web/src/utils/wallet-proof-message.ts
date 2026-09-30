/*
 * The message a reader signs to prove they hold a wallet (see
 * @/lib/wallet-proof). It names the address and when it was issued, so a
 * signature cannot be replayed for another wallet or long after the fact.
 * Kept free of crypto dependencies so the page can build it too.
 */

const MAX_AGE_MS = 10 * 60 * 1000;

export const proofMessage = (address: string, issuedAt: string) =>
  `Lumera Hub × Snag\nLink wallet ${address}\nIssued ${issuedAt}`;

/** The message names this address and was issued within the last few minutes. */
export function freshProofMessage(message: string, address: string, now = Date.now()): boolean {
  const match = /^Lumera Hub × Snag\nLink wallet (\S+)\nIssued (\S+)$/.exec(message);
  if (!match || match[1] !== address) return false;
  const issued = Date.parse(match[2]);
  return Number.isFinite(issued) && issued <= now + 60_000 && now - issued <= MAX_AGE_MS;
}
