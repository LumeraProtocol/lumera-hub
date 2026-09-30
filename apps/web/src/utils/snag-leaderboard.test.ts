import { describe, expect, it } from 'vitest';

import { buildLeaderboard, leaderName, shortWallet } from './snag-leaderboard';

const account = (userId: string | null, amount: string, meta: object = {}, wallet = '0x97f5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1234') => ({
  userId,
  amount,
  user: userId ? { id: userId, walletAddress: wallet, userMetadata: [meta] } : null,
});

describe('leaderName', () => {
  it('prefers the SNAG display name, then the X handle, then a short wallet', () => {
    expect(leaderName(account('u', '1', { displayName: ' Kal ', twitterUser: 'kal' }))).toBe('Kal');
    expect(leaderName(account('u', '1', { twitterUser: '@kal' }))).toBe('@kal');
    expect(leaderName(account('u', '1'))).toBe('0x97f5…1234');
  });

  it('never shows a full wallet', () => {
    expect(shortWallet('lumera1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq')).toBe('lumera…qqqq');
  });
});

describe('buildLeaderboard', () => {
  it('ranks players, sharing a place on equal points, and skips currency accounts', () => {
    const rows = buildLeaderboard([account(null, '9999'), account('a', '300'), account('b', '200'), account('c', '200'), account('d', '50')]);
    expect(rows.map((r) => [r.rank, r.points])).toEqual([
      [1, 300],
      [2, 200],
      [2, 200],
      [4, 50],
    ]);
  });

  it('marks the reader’s own row', () => {
    const rows = buildLeaderboard([account('a', '300'), account('b', '200')], 'b');
    expect(rows.map((r) => Boolean(r.you))).toEqual([false, true]);
  });
});
