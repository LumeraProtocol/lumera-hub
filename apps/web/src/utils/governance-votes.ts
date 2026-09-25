export interface GovernanceVoteOption {
  option: string;
  weight: string;
}

export interface GovernanceVote {
  proposal_id: string;
  voter: string;
  options: GovernanceVoteOption[];
  metadata?: string;
}

const VOTE_OPTION_LABELS: Record<string, string> = {
  VOTE_OPTION_YES: 'Yes',
  VOTE_OPTION_ABSTAIN: 'Abstain',
  VOTE_OPTION_NO: 'No',
  VOTE_OPTION_NO_WITH_VETO: 'No With Veto',
};

const VOTE_OPTION_VALUES: Record<string, string> = {
  VOTE_OPTION_YES: '1',
  VOTE_OPTION_ABSTAIN: '2',
  VOTE_OPTION_NO: '3',
  VOTE_OPTION_NO_WITH_VETO: '4',
};

export const getGovernanceVoteValue = (vote?: GovernanceVote | null) => {
  if (vote?.options?.length !== 1 || Number(vote.options[0].weight) !== 1) {
    return '';
  }

  return VOTE_OPTION_VALUES[vote.options[0].option] || '';
};

export const getGovernanceVoteFormValue = (vote?: GovernanceVote | null) =>
  getGovernanceVoteValue(vote) || '1';

export const formatGovernanceVote = (vote?: GovernanceVote | null) => {
  const options = vote?.options?.filter(({ weight }) => Number(weight) > 0) || [];

  if (options.length === 0) {
    return '';
  }

  if (options.length === 1 && Number(options[0].weight) === 1) {
    return VOTE_OPTION_LABELS[options[0].option] || options[0].option;
  }

  return options
    .map(({ option, weight }) => `${VOTE_OPTION_LABELS[option] || option} ${Number(weight) * 100}%`)
    .join(', ');
};

/** How a vote should be coloured. Mirrors the tally's own palette. */
export type VoteTone = 'yes' | 'no' | 'abstain' | 'veto';

const VOTE_OPTION_TONES: Record<string, VoteTone> = {
  VOTE_OPTION_YES: 'yes',
  VOTE_OPTION_ABSTAIN: 'abstain',
  VOTE_OPTION_NO: 'no',
  VOTE_OPTION_NO_WITH_VETO: 'veto',
};

/**
 * The option carrying most of a vote's weight.
 *
 * A vote can be split across options, so there is not always one answer — but
 * a row still has to be one colour. The heaviest option decides it, while the
 * label from `formatGovernanceVote` keeps the split visible. Ties fall to
 * whichever the chain listed first, which is stable for a given proposal.
 */
export const dominantVoteTone = (vote?: GovernanceVote | null): VoteTone | null => {
  const options = vote?.options?.filter(({ weight }) => Number(weight) > 0) ?? [];
  if (!options.length) return null;

  const heaviest = options.reduce((best, o) =>
    Number(o.weight) > Number(best.weight) ? o : best,
  );
  return VOTE_OPTION_TONES[heaviest.option] ?? null;
};
