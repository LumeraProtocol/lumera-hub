// apps/web/src/app/page.tsx
'use client'
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet-async';

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useAccountInfo from '@/hooks/useAccountInfo';
import useProposals, { IProposal } from '@/hooks/useProposals';
import useRecentActivity from '@/hooks/useRecentActivity';
import useStats from '@/hooks/useStats';
import useStaking from '@/hooks/useStaking';
import useChainParams from '@/hooks/useChainParams';
import useValidatorLogos from '@/hooks/useValidatorLogos';
import { RATE_VALUE } from '@/contants';
import { formatNumber } from '@/utils/format';
import {
  getAvailableBalances,
  getDelegations,
  getRewards,
  getUnbonding,
} from '@/utils/portfolio';
import {
  DashboardScreen,
  type ActivityRow,
  type AllocationRow,
  type DashboardStat,
  type OpenProposal,
} from '@lumera-hub/ui/src/screens/hub/DashboardScreen';
import { useHub } from '@lumera-hub/ui/src/hub/session';
import { TxDetailDrawer } from '@/components/hub/TxDetailDrawer';

const lume = (micro: number, digits = 2) =>
  formatNumber(micro / RATE_VALUE, { decimalsLength: digits, currency: 'en-US' });

const compact = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

const initialsOf = (name: string) => {
  const words = String(name).replace(/[^A-Za-z0-9. ]/g, '').trim().split(/[\s.]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '··';
};

/** Cosmos gov v1 statuses are shouty enum strings; these are the readable ones. */
const isVotingOpen = (status: string) => status === 'PROPOSAL_STATUS_VOTING_PERIOD';

export default function Page() {
  const dispatch = useDispatch();
  const router = useRouter();
  const hub = useHub();

  useEffect(() => {
    document.title = 'Dashboard - Lumera Hub';
    dispatch(setCurrentPath({ currentPath: '/' }));
    dispatch(setViewTitle({ viewTitle: 'Dashboard' }));
  }, [dispatch]);

  const { accountInfo, loading, handleClaimButtonClick } = useAccountInfo(
    hub.isWatching ? { address: hub.address } : {},
  );
  const proposals = useProposals();
  const recentActivityData = useRecentActivity();
  const { stats, latestBlock } = useStats();
  const { validators, activeValidators, apr, bondedTokens } = useStaking();
  const { params: chainParams } = useChainParams();
  const logos = useValidatorLogos(activeValidators);

  const liquid = getAvailableBalances(accountInfo);
  const staked = getDelegations(accountInfo);
  const rewards = getRewards(accountInfo);
  const unbonding = getUnbonding(accountInfo);

  /*
   * Four figures that mean different things depending on who is looking. With
   * a position they describe it; without one they describe the chain, which is
   * public and therefore always available.
   */
  const dashboardStats: DashboardStat[] = useMemo(() => {
    if (hub.hasPosition) {
      const netApr = Number(apr) || 0;
      return [
        {
          label: 'AVAILABLE',
          value: lume(liquid),
          foot: 'liquid, ready to send or delegate',
          deltaTone: 'flat',
        },
        {
          label: 'STAKED',
          value: lume(staked),
          foot: `across ${accountInfo?.delegations?.length || 0} validator${
            accountInfo?.delegations?.length === 1 ? '' : 's'
          }`,
          deltaTone: 'flat',
        },
        {
          label: 'UNCLAIMED REWARDS',
          value: lume(rewards),
          tone: 'green',
          foot: unbonding > 0 ? `${lume(unbonding)} LUME also unbonding` : 'claim any time',
          deltaTone: 'up',
        },
        {
          label: 'EST. ANNUAL YIELD',
          value: netApr ? lume(staked * (netApr / 100), 0) : '—',
          foot: netApr ? `LUME · at ${netApr.toFixed(1)}% net APR` : 'awaiting the chain',
          deltaTone: 'flat',
        },
      ];
    }

    const supply = Number(stats.supply) || 0;
    const bonded = Number(bondedTokens) || Number(stats.bondedTokens) || 0;
    const bondedPct = supply ? (bonded / supply) * 100 : 0;
    return [
      {
        label: 'BONDED STAKE',
        value: bonded ? compact(bonded / RATE_VALUE) : '—',
        foot: bondedPct
          ? `${bondedPct.toFixed(1)}% of ${compact(supply / RATE_VALUE)} supply`
          : bonded
            ? 'bonded across the active set'
            : 'loading from the chain',
        delta: bonded ? 'live' : '',
        deltaTone: 'flat',
      },
      {
        label: 'STAKING APR',
        value: apr ? `${Number(apr).toFixed(1)}%` : '—',
        // The chain reports inflation over the bonded ratio net of community
        // tax but before each validator's commission, so this is the gross
        // figure. Per-validator net APR is shown on the staking screen.
        foot: 'gross, before validator commission',
        delta: apr ? 'live' : '',
        deltaTone: 'flat',
      },
      {
        label: 'ACTIVE VALIDATORS',
        value: activeValidators?.length ? String(activeValidators.length) : '—',
        foot: latestBlock.validators ? `${latestBlock.validators} signed the last block` : 'active set',
        deltaTone: 'flat',
      },
      {
        label: 'LATEST BLOCK',
        value: latestBlock.height ? `#${Number(latestBlock.height).toLocaleString('en-US')}` : '—',
        foot: 'the chain head right now',
        delta: latestBlock.height ? 'live' : '',
        deltaTone: 'flat',
      },
    ];
  }, [
    accountInfo?.delegations?.length,
    apr,
    bondedTokens,
    hub.hasPosition,
    latestBlock.height,
    latestBlock.validators,
    liquid,
    rewards,
    staked,
    stats.bondedTokens,
    stats.supply,
    unbonding,
    activeValidators?.length,
  ]);

  /*
   * With a position this lists the reader's delegations; without one it lists
   * the top of the active set, so the card is never an empty box.
   */
  const allocations: AllocationRow[] = useMemo(() => {
    if (hub.hasPosition && accountInfo?.delegations?.length) {
      const rows = accountInfo.delegations
        .map((d) => {
          const validator = validators?.find(
            (v) => v.operator_address === d.delegation.validator_address,
          );
          const name = validator?.description?.moniker || d.delegation.validator_address;
          return {
            key: d.delegation.validator_address,
            name,
            initials: initialsOf(name),
            logo: logos[d.delegation.validator_address],
            micro: Number(d.balance.amount) || 0,
            commission: validator?.commission?.commission_rates?.rate,
          };
        })
        .sort((a, b) => b.micro - a.micro);
      const total = rows.reduce((sum, r) => sum + r.micro, 0) || 1;
      return rows.map((r) => ({
        key: r.key,
        name: r.name,
        initials: r.initials,
        logo: r.logo,
        amount: `${lume(r.micro, 0)} LUME`,
        pct: `${((r.micro / total) * 100).toFixed(1)}%`,
        side: r.commission ? `${(Number(r.commission) * 100).toFixed(0)}%` : '—',
        onMove: () => router.push('/staking'),
      }));
    }

    const top = [...(activeValidators || [])]
      .sort((a, b) => (Number(b.tokens) || 0) - (Number(a.tokens) || 0))
      .slice(0, 8);
    const leader = Number(top[0]?.tokens) || 1;
    return top.map((v) => ({
      key: v.operator_address,
      name: v.description?.moniker || v.operator_address,
      initials: initialsOf(v.description?.moniker || '··'),
      logo: logos[v.operator_address],
      amount: `${(((Number(v.tokens) || 0) / (Number(bondedTokens) || 1)) * 100).toFixed(2)}%`,
      pct: `${(((Number(v.tokens) || 0) / leader) * 100).toFixed(0)}%`,
      side: `${(Number(v.commission?.commission_rates?.rate || 0) * 100).toFixed(0)}%`,
    }));
  }, [accountInfo?.delegations, activeValidators, bondedTokens, hub.hasPosition, logos, router, validators]);

  const activity: ActivityRow[] = useMemo(
    () =>
      (recentActivityData.recentActivity || []).slice(0, 5).map((tx) => {
        const type = tx.tx?.body?.messages?.[0]?.['@type'] || '';
        const kind = type.split('.').pop()?.replace(/^Msg/, '') || 'Transaction';
        return {
          key: tx.txhash,
          kind: kind.replace(/([a-z])([A-Z])/g, '$1 $2'),
          detail: `${tx.txhash.slice(0, 10)}…`,
          amount: `#${Number(tx.height).toLocaleString('en-US')}`,
          when: tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : '',
          direction: /Receive|WithdrawDelegatorReward/.test(kind) ? 'in' : 'out',
          onOpen: () => hub.openDrawer({ kind: 'txdetail', hash: tx.txhash }),
        } as ActivityRow;
      }),
    [hub, recentActivityData.recentActivity],
  );

  const proposal: OpenProposal | null = useMemo(() => {
    const live: IProposal | undefined = (proposals.proposalsInfo || []).find((p) =>
      isVotingOpen(p.status),
    );
    if (!live) return null;
    const tally = live.final_tally_result;
    const counts = [
      Number(tally?.yes_count) || 0,
      Number(tally?.no_count) || 0,
      Number(tally?.abstain_count) || 0,
      Number(tally?.no_with_veto_count) || 0,
    ];
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    const pct = (n: number) => (n / total) * 100;
    const closes = live.voting_end_time ? new Date(live.voting_end_time) : null;
    const daysLeft = closes
      ? Math.max(0, Math.ceil((closes.getTime() - Date.now()) / 86400000))
      : null;
    return {
      id: `#${live.id}`,
      kind: (live.messages?.[0]?.['@type'] || 'Proposal').split('.').pop() || 'Proposal',
      title: live.title,
      clock: daysLeft !== null ? `Ends in ${daysLeft}d` : 'Voting open',
      yes: pct(counts[0]),
      no: pct(counts[1]),
      abstain: pct(counts[2]),
      veto: pct(counts[3]),
      quorum: (total / (Number(bondedTokens) || total)) * 100,
      quorumNeeded: chainParams.quorum,
      onOpen: () => router.push(`/governance/${live.id}`),
      onVote: () =>
        hub.gate(
          { title: `Vote on proposal #${live.id}`, line: live.title },
          () => router.push(`/governance/${live.id}`),
        ),
    };
  }, [bondedTokens, chainParams.quorum, hub, proposals.proposalsInfo, router]);

  return (
    <>
      <Helmet>
        <title>Dashboard - Lumera Hub</title>
      </Helmet>
      <DashboardScreen
        loading={loading && hub.hasPosition}
        stats={dashboardStats}
        allocationTitle={hub.hasPosition ? 'Delegations' : 'Active validators'}
        allocationLink={hub.hasPosition ? 'Manage' : `See all ${activeValidators?.length || ''}`.trim()}
        allocations={allocations}
        onAllocationLink={() => router.push('/staking')}
        activity={activity}
        proposal={proposal}
        claimLabel={rewards > 0 ? `Claim ${lume(rewards)} LUME` : 'Claim rewards'}
        onClaim={() =>
          hub.gate(
            {
              title: 'Claim staking rewards',
              line:
                rewards > 0
                  ? `${lume(rewards)} LUME across ${accountInfo?.rewards?.length || 0} validators`
                  : 'Rewards accrue every block once you delegate',
            },
            () => handleClaimButtonClick(),
          )
        }
        onSeeActivity={() => router.push('/wallet')}
      />
      <TxDetailDrawer />
    </>
  );
}
