/*
 * Shapes SNAG loyalty accounts into leaderboard rows for /snag: who each
 * account is (the name they set on SNAG, else their X handle, else a shortened
 * wallet), their points, and their place.
 *
 * Wallets are shortened here, on the server, so full addresses of other
 * players never reach the page.
 */

export type SnagAccount = {
  id?: string
  userId?: string | null
  amount?: unknown
  user?: {
    id?: string
    walletAddress?: string | null
    userMetadata?: Array<{ displayName?: string | null; twitterUser?: string | null; logoUrl?: string | null }> | null
  } | null
}

export type LeaderEntry = {
  rank: number
  name: string
  points: number
  /** This row is the reader's own account. */
  you?: boolean
}

export const shortWallet = (wallet: string) =>
  wallet.length > 14 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet

/** How an account is named on the board. */
export function leaderName(account: SnagAccount): string {
  const meta = account.user?.userMetadata?.[0]
  const display = meta?.displayName?.trim()
  if (display) return display
  const handle = meta?.twitterUser?.trim().replace(/^@/, '')
  if (handle) return `@${handle}`
  const wallet = account.user?.walletAddress
  return wallet ? shortWallet(wallet) : 'Anonymous'
}

export const accountPoints = (account: SnagAccount) => Math.max(0, Math.floor(Number(account.amount) || 0))

/**
 * Leaderboard rows from accounts already sorted by points, highest first.
 * Currency-level accounts (no user) are not players and are left out; players
 * with equal points share a place.
 */
export function buildLeaderboard(accounts: SnagAccount[], youUserId?: string | null): LeaderEntry[] {
  const rows: LeaderEntry[] = []
  let place = 0
  let last: number | null = null
  accounts
    .filter((a) => a.userId)
    .forEach((account, i) => {
      const points = accountPoints(account)
      if (points !== last) {
        place = i + 1
        last = points
      }
      rows.push({
        rank: place,
        name: leaderName(account),
        points,
        ...(youUserId && account.userId === youUserId ? { you: true } : {}),
      })
    })
  return rows
}
