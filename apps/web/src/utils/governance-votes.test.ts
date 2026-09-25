import { describe, expect, it } from 'vitest';

import {
  dominantVoteTone,
  formatGovernanceVote,
  getGovernanceVoteFormValue,
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

  it('defaults a proposal without a prior vote to Yes for display and submission', () => {
    expect(getGovernanceVoteFormValue()).toBe('1');
  });

  it('preserves an existing vote when a proposal dialog opens', () => {
    expect(getGovernanceVoteFormValue(vote([
      { option: 'VOTE_OPTION_NO', weight: '1.000000000000000000' },
    ]))).toBe('3');
  });
});

describe('dominantVoteTone', () => {
  it('reads a whole vote', () => {
    expect(dominantVoteTone(vote([{ option: 'VOTE_OPTION_YES', weight: '1' }]))).toBe('yes');
    expect(dominantVoteTone(vote([{ option: 'VOTE_OPTION_NO_WITH_VETO', weight: '1' }]))).toBe(
      'veto',
    );
  });

  it('takes the heaviest side of a split vote', () => {
    expect(
      dominantVoteTone(
        vote([
          { option: 'VOTE_OPTION_YES', weight: '0.25' },
          { option: 'VOTE_OPTION_NO', weight: '0.75' },
        ]),
      ),
    ).toBe('no');
  });

  it('ignores options carrying no weight', () => {
    expect(
      dominantVoteTone(
        vote([
          { option: 'VOTE_OPTION_NO', weight: '0' },
          { option: 'VOTE_OPTION_ABSTAIN', weight: '1' },
        ]),
      ),
    ).toBe('abstain');
  });

  it('has no answer for an empty or unknown vote', () => {
    expect(dominantVoteTone(vote([]))).toBeNull();
    expect(dominantVoteTone(null)).toBeNull();
    expect(dominantVoteTone(vote([{ option: 'VOTE_OPTION_UNSPECIFIED', weight: '1' }]))).toBeNull();
  });
});
