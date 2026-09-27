import { describe, expect, it } from 'vitest';

import { depositRules } from './governance-view';

describe('depositRules', () => {
  it('describes a veto-only burn with refunds for a short deposit period', () => {
    // Both Lumera networks run these switches.
    const rules = depositRules(
      { burnVoteVeto: true, burnVoteQuorum: false, burnDepositPrevote: false },
      '1,000 LUME',
    );
    expect(rules.refund).toBe(
      'Deposits are returned when voting ends, unless the proposal is vetoed, which burns them.',
    );
    expect(rules.short).toBe(
      'If the deposit period ends short of 1,000 LUME, the proposal is dropped and every deposit is refunded.',
    );
  });

  it('names every burn condition the chain has switched on', () => {
    const rules = depositRules(
      { burnVoteVeto: true, burnVoteQuorum: true, burnDepositPrevote: true },
      '1,000 LUME',
    );
    expect(rules.refund).toBe(
      'Deposits are returned when voting ends, unless the proposal is vetoed or misses quorum, which burns them.',
    );
    expect(rules.short).toBe(
      'If the deposit period ends short of 1,000 LUME, every deposit on the proposal is burned.',
    );
  });

  it('says deposits always come back when nothing burns them', () => {
    const rules = depositRules(
      { burnVoteVeto: false, burnVoteQuorum: false, burnDepositPrevote: false },
      '1,000 LUME',
    );
    expect(rules.refund).toBe('Deposits are returned when voting ends, whatever the outcome.');
  });

  it('asserts nothing when the switches did not load', () => {
    expect(
      depositRules({ burnVoteVeto: null, burnVoteQuorum: null, burnDepositPrevote: null }, '1,000 LUME'),
    ).toEqual({ refund: null, short: null });
  });
});
