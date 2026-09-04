import type { IProposal } from '@/hooks/useProposals';
import type { ProposalStatus, ProposalSummary } from '@lumera-hub/ui/src/screens/hub/GovernanceScreen';
import { RATE_VALUE } from '@/contants';

/**
 * Shared shaping for the governance list and detail screens, so the two cannot
 * disagree about a proposal's status, tally or turnout.
 */

/** Cosmos gov v1 statuses, mapped to what a reader is shown. */
export const readableStatus = (status: string): ProposalStatus => {
  switch (status) {
    case 'PROPOSAL_STATUS_VOTING_PERIOD':
      return 'Voting';
    case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
      return 'Deposit';
    case 'PROPOSAL_STATUS_PASSED':
      return 'Passed';
    case 'PROPOSAL_STATUS_REJECTED':
      return 'Rejected';
    default:
      return 'Failed';
  }
};

export const proposalKind = (proposal: IProposal) => {
  const type = proposal.messages?.[0]?.['@type'] || '';
  const bare = type.split('.').pop() || '';
  if (/MsgCommunityPoolSpend/.test(bare)) return 'Community pool spend';
  if (/MsgUpdateParams|ParameterChange/.test(bare)) return 'Parameter change';
  if (/MsgSoftwareUpgrade/.test(bare)) return 'Software upgrade';
  if (/MsgExecLegacyContent/.test(bare)) return 'Legacy content';
  return bare.replace(/^Msg/, '').replace(/([a-z])([A-Z])/g, '$1 $2') || 'Text';
};

/** Tally shares. Returns zeroes rather than NaN when nothing has voted. */
export const tallyShares = (proposal: IProposal) => {
  const t = proposal.final_tally_result;
  const yes = Number(t?.yes_count) || 0;
  const no = Number(t?.no_count) || 0;
  const abstain = Number(t?.abstain_count) || 0;
  const veto = Number(t?.no_with_veto_count) || 0;
  const total = yes + no + abstain + veto;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return {
    total,
    yes: pct(yes),
    no: pct(no),
    abstain: pct(abstain),
    veto: pct(veto),
    counts: { yes, no, abstain, veto },
  };
};

/** Turnout as a share of bonded stake. */
export const turnoutPct = (votedTotal: number, bondedTokens: number) =>
  bondedTokens ? (votedTotal / bondedTokens) * 100 : 0;

export const relativeClock = (proposal: IProposal, status: ProposalStatus) => {
  const deadline =
    status === 'Deposit' ? proposal.deposit_end_time : proposal.voting_end_time;
  if (!deadline) return status === 'Voting' ? 'Voting open' : '';
  const ms = new Date(deadline).getTime() - Date.now();
  if (status !== 'Voting' && status !== 'Deposit') {
    return `${status} ${new Date(deadline).toLocaleDateString()}`;
  }
  if (ms <= 0) return 'Closing';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const label = status === 'Deposit' ? 'Deposit ends' : 'Ends';
  return days > 0 ? `${label} in ${days}d ${hours}h` : `${label} in ${hours}h`;
};

export const depositProgress = (proposal: IProposal, requiredMicro: number) => {
  const have = (proposal.total_deposit || []).reduce(
    (sum, coin) => sum + (Number(coin.amount) || 0),
    0,
  );
  const fmt = (micro: number) =>
    `${(micro / RATE_VALUE).toLocaleString('en-US', { maximumFractionDigits: 0 })} LUME`;
  return {
    have: fmt(have),
    need: fmt(requiredMicro),
    pct: requiredMicro ? Math.min(100, (have / requiredMicro) * 100) : 0,
  };
};

export const toSummary = (
  proposal: IProposal,
  bondedTokens: number,
  requiredDepositMicro: number | null,
  quorumNeeded: number | null,
  onOpen: () => void,
): ProposalSummary => {
  const status = readableStatus(proposal.status);
  const shares = tallyShares(proposal);
  return {
    id: `#${proposal.id}`,
    numericId: proposal.id,
    status,
    kind: proposalKind(proposal),
    title: proposal.title || `Proposal ${proposal.id}`,
    summary: proposal.summary || 'No summary was submitted with this proposal.',
    clock: relativeClock(proposal, status),
    yes: shares.yes,
    no: shares.no,
    abstain: shares.abstain,
    veto: shares.veto,
    quorum: turnoutPct(shares.total, bondedTokens),
    quorumNeeded,
    ...(status === 'Deposit' && requiredDepositMicro
      ? { depositProgress: depositProgress(proposal, requiredDepositMicro) }
      : {}),
    onOpen,
  };
};

export const timelineOf = (proposal: IProposal, status: ProposalStatus) => {
  const at = (iso?: string) =>
    iso && !iso.startsWith('0001')
      ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : '—';
  const past = (iso?: string) => !!iso && !iso.startsWith('0001') && new Date(iso) <= new Date();
  const closed = status === 'Passed' || status === 'Rejected' || status === 'Failed';
  return [
    { label: 'Submitted', when: at(proposal.submit_time), state: 'done' as const },
    {
      label: 'Deposit period ends',
      when: at(proposal.deposit_end_time),
      state: past(proposal.deposit_end_time) ? ('done' as const) : ('pending' as const),
    },
    {
      label: 'Voting opened',
      when: at(proposal.voting_start_time),
      state: past(proposal.voting_start_time) ? ('done' as const) : ('pending' as const),
    },
    {
      label: closed ? status : 'Voting closes',
      when: at(proposal.voting_end_time),
      state: closed
        ? status === 'Passed'
          ? ('done' as const)
          : ('failed' as const)
        : ('pending' as const),
    },
  ];
};
