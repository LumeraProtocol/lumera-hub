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
import {
  DEFAULT_QUORUM,
  DEFAULT_THRESHOLD,
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

const compact = (micro: number) => {
  const n = micro / RATE_VALUE;
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B LUME`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M LUME`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K LUME`;
  return `${n.toFixed(0)} LUME`;
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

  const { isLoading, governance, fetchGovernanceDetail, fetchVotes } = useGovernanceDetails(id);
  const { bondedTokens } = useStaking();

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
      quorumNeeded: DEFAULT_QUORUM,
      thresholdNeeded: DEFAULT_THRESHOLD,
      totalVoted: compact(votedMicro),
      timeline: timelineOf(governance, status),
      tally: [
        {
          label: 'Yes',
          pct: shares.yes,
          amount: compact(shares.counts.yes),
          className:
            'bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))]',
        },
        { label: 'No', pct: shares.no, amount: compact(shares.counts.no), className: 'bg-danger' },
        {
          label: 'Abstain',
          pct: shares.abstain,
          amount: compact(shares.counts.abstain),
          className: 'bg-neutral-bar',
        },
        {
          label: 'No with veto',
          pct: shares.veto,
          amount: compact(shares.counts.veto),
          className: 'bg-danger-deep',
        },
      ],
      onOpen: () => undefined,
    };
  }, [bonded, governance]);

  const isDepositPeriod = detail?.status === 'Deposit';

  return (
    <>
      <Helmet>
        <title>{governance?.title || 'Proposal'} - Lumera Hub</title>
      </Helmet>

      <GovernanceDetailScreen
        loading={isLoading}
        proposal={detail}
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
