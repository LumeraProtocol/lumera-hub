// apps/web/src/app/governance/[id]/page.tsx
'use client';
import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet-async';

import useGovernanceDetails from '@/hooks/useGovernanceDetails';
import useDeposit from '@/hooks/useDeposit';
import useProposals from '@/hooks/useProposals';
import useStaking from '@/hooks/useStaking';
import { RATE_VALUE } from '@/contants';
import useChainParams, { formatDuration } from '@/hooks/useChainParams';
import useValidatorLogos from '@/hooks/useValidatorLogos';
import useAccountInfo from '@/hooks/useAccountInfo';
import { accountAddressFromValoper } from '@/utils/consensus-address';
import { dominantVoteTone, formatGovernanceVote } from '@/utils/governance-votes';
import { getDelegations } from '@/utils/portfolio';
import { formatNumber } from '@/utils/format';
import {
  depositProgress,
  proposalKind,
  readableStatus,
  relativeClock,
  tallyShares,
  timelineOf,
  turnoutPct,
} from '@/utils/governance-view';
import { GovernanceDetailScreen, type ProposalDetail } from '@lumera-hub/ui/src/screens/hub/GovernanceScreen';
import { useHub } from '@lumera-hub/ui/src/hub/session';
import { TxDrawer } from '@/components/hub/TxDrawer';
import { VoteDrawer, type VoteChoice } from '@/components/hub/VoteDrawer';

interface Props {
  params: Promise<{ id: string }>;
}

/** "1.2M LUME". The tally rows pass no unit, as the design prints them. */
const compact = (micro: number, unit = ' LUME') => {
  const n = micro / RATE_VALUE;
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B${unit}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M${unit}`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K${unit}`;
  return `${n.toFixed(0)}${unit}`;
};

/** The gov module's numeric vote codes, keyed by the choice the reader picked. */
const VOTE_CODE: Record<VoteChoice, string> = {
  yes: '1',
  abstain: '2',
  no: '3',
  veto: '4',
};

const VOTE_LABEL: Record<VoteChoice, string> = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstain',
  veto: 'No with veto',
};

export default function Page({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const hub = useHub();

  const { isLoading, governance, votes, fetchGovernanceDetail, fetchVotes } =
    useGovernanceDetails(id);
  const { bondedTokens, validators } = useStaking();
  const logos = useValidatorLogos(validators);
  const { params: chainParams } = useChainParams();
  // Voting weight is bonded stake, read for whichever address the hub is on.
  const { accountInfo } = useAccountInfo(hub.isWatching ? { address: hub.address } : {});
  const myStake = getDelegations(accountInfo);

  const proposals = useProposals({
    customMemo: governance?.title ? `Vote for the ${governance.title}` : '',
    callback: () => {
      fetchGovernanceDetail(id);
      fetchVotes();
    },
  });

  const deposit = useDeposit({
    callback: () => fetchGovernanceDetail(id),
    customMemo: governance?.title ? `Deposit for the ${governance.title}` : '',
  });

  useEffect(() => {
    document.title = governance?.title
      ? `${governance.title} - Lumera Hub`
      : 'Proposal - Lumera Hub';
  }, [governance?.title]);

  const bonded = Number(bondedTokens) || 0;

  /*
   * Who voted, heaviest first.
   *
   * Governance records a vote against the account that cast it, so a validator's
   * vote arrives under its account address rather than its operator address.
   * Re-encoding the operator address bridges the two, which is what lets a vote
   * carry the weight of the stake behind it.
   *
   * Only validator votes are ranked. A delegator's weight would need a separate
   * query per address to establish, and validators hold nearly all of the
   * bonded stake — so the list is labelled as validators rather than implying
   * it is every voter.
   */
  const voters = useMemo(() => {
    if (!votes?.length || !validators?.length || !bonded) return [];

    const byAccount = new Map<string, (typeof validators)[number]>();
    for (const v of validators) {
      const account = accountAddressFromValoper(v.operator_address);
      if (account) byAccount.set(account, v);
    }

    return votes
      .map((vote) => {
        const validator = byAccount.get(vote.voter);
        if (!validator) return null;

        const label = formatGovernanceVote(vote);
        if (!label) return null;

        return {
          address: vote.voter,
          name: validator.description?.moniker || vote.voter,
          logo: logos[validator.operator_address],
          vote: label,
          tone: dominantVoteTone(vote),
          weight: (Number(validator.tokens) / bonded) * 100,
          onOpen: () => router.push(`/staking/${validator.operator_address}`),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
  }, [bonded, logos, router, validators, votes]);

  const detail: ProposalDetail | null = useMemo(() => {
    if (!governance) return null;
    const status = readableStatus(governance.status);
    const shares = tallyShares(governance);
    const votedMicro = shares.total;

    return {
      id: `#${governance.id}`,
      numericId: governance.id,
      status,
      kind: proposalKind(governance),
      title: governance.title || `Proposal ${governance.id}`,
      summary: governance.summary || 'No summary was submitted with this proposal.',
      description: '',
      clock: relativeClock(governance, status),
      yes: shares.yes,
      no: shares.no,
      abstain: shares.abstain,
      veto: shares.veto,
      quorum: turnoutPct(votedMicro, bonded),
      quorumNeeded: chainParams.quorum,
      thresholdNeeded: chainParams.threshold,
      vetoThreshold: chainParams.vetoThreshold,
      votingPeriod: formatDuration(chainParams.votingPeriodSeconds),
      totalVoted: compact(votedMicro),
      timeline: timelineOf(governance, status),
      voters,
      // The detail's deposit card had no data to draw from; the chain's own
      // minimum is the denominator, as on the list.
      ...(status === 'Deposit' && chainParams.minDepositMicro
        ? { depositProgress: depositProgress(governance, chainParams.minDepositMicro) }
        : {}),
      tally: [
        {
          label: 'Yes',
          pct: shares.yes,
          amount: compact(shares.counts.yes, ''),
          className:
            'bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))]',
        },
        { label: 'No', pct: shares.no, amount: compact(shares.counts.no, ''), className: 'bg-danger' },
        {
          label: 'Abstain',
          pct: shares.abstain,
          amount: compact(shares.counts.abstain, ''),
          className: 'bg-neutral-bar',
        },
        {
          label: 'No with veto',
          pct: shares.veto,
          amount: compact(shares.counts.veto, ''),
          // Amber on the detail, as the design has it, so veto reads apart
          // from a plain No.
          className: 'bg-warn',
        },
      ],
      onOpen: () => undefined,
    };
    // `voters` resolves after the proposal does; without it here the Voters
    // card kept whatever the first render had, which was nothing.
  }, [bonded, chainParams, governance, voters]);

  const isDepositPeriod = detail?.status === 'Deposit';

  const votingWeight =
    hub.hasPosition && myStake
      ? `${formatNumber(myStake / RATE_VALUE, { decimalsLength: 0, currency: 'en-US' })} LUME`
      : 'None yet';

  return (
    <>
      <Helmet>
        <title>{governance?.title || 'Proposal'} - Lumera Hub</title>
      </Helmet>

      <GovernanceDetailScreen
        loading={isLoading}
        proposal={detail}
        votingWeight={votingWeight}
        onBack={() => router.push('/governance')}
        onVote={() => {
          if (!detail) return;
          if (isDepositPeriod) {
            hub.gate(
              { title: `Deposit on ${detail.id}`, line: detail.title },
              () =>
                hub.openDrawer({
                  kind: 'tx',
                  intent: {
                    title: `Deposit on ${detail.id}`,
                    lineLabel: 'Proposal',
                    line: detail.title,
                  },
                }),
            );
            return;
          }
          hub.gate({ title: `Vote on ${detail.id}`, line: detail.title }, () =>
            hub.openDrawer({ kind: 'vote', proposalId: detail.id }),
          );
        }}
      />

      {detail ? (
        <VoteDrawer
          proposalTitle={detail.title}
          tally={{ yes: detail.yes, no: detail.no, abstain: detail.abstain, veto: detail.veto }}
          weight={votingWeight}
          onConfirm={(choice) => {
            proposals.handleOptionChange(VOTE_CODE[choice]);
            hub.openDrawer({
              kind: 'tx',
              intent: {
                title: `Vote ${VOTE_LABEL[choice]} on ${detail.id}`,
                lineLabel: 'Proposal',
                line: detail.title,
              },
            });
          }}
        />
      ) : null}

      <TxDrawer
        onBroadcast={async () => {
          if (isDepositPeriod) {
            await deposit.handleSendClick();
            return;
          }
          await proposals.handleVote(governance);
        }}
        error={(isDepositPeriod ? deposit.error : proposals.errorVote) || undefined}
        transactionHash={isDepositPeriod ? deposit.transactionHash : proposals.transactionHash}
        onDone={() => {
          fetchGovernanceDetail(id);
          fetchVotes();
        }}
      />
    </>
  );
}
