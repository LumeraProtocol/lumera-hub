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
