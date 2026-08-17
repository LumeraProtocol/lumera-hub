import { describe, expect, it } from 'vitest';

import {
  formatGovernanceVote,
  getGovernanceVoteValue,
  GovernanceVote,
} from './governance-votes';

const vote = (options: GovernanceVote['options']): GovernanceVote => ({
  proposal_id: '15',
  voter: 'lumera1voter',
  options,
});

describe('formatGovernanceVote', () => {
  it('formats a standard vote', () => {
    expect(formatGovernanceVote(vote([
      { option: 'VOTE_OPTION_YES', weight: '1.000000000000000000' },
    ]))).toBe('Yes');
  });

  it('formats a weighted vote', () => {
    expect(formatGovernanceVote(vote([
      { option: 'VOTE_OPTION_YES', weight: '0.750000000000000000' },
      { option: 'VOTE_OPTION_ABSTAIN', weight: '0.250000000000000000' },
    ]))).toBe('Yes 75%, Abstain 25%');
  });

  it('returns an empty label when no vote is available', () => {
    expect(formatGovernanceVote()).toBe('');
  });

  it('maps a standard chain vote back to the form value', () => {
    expect(getGovernanceVoteValue(vote([
      { option: 'VOTE_OPTION_NO_WITH_VETO', weight: '1.000000000000000000' },
    ]))).toBe('4');
  });

  it('does not map a weighted vote to the single-choice form', () => {
    expect(getGovernanceVoteValue(vote([
      { option: 'VOTE_OPTION_YES', weight: '0.500000000000000000' },
      { option: 'VOTE_OPTION_NO', weight: '0.500000000000000000' },
    ]))).toBe('');
  });
});
