// apps/web/src/app/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet-async';

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useAccountInfo from '@/hooks/useAccountInfo';
import useProposals, { IProposal } from '@/hooks/useProposals';
import useRecentActivity from '@/hooks/useRecentActivity';
import useNetworkStats, { BLOCK_TIME_SAMPLE } from '@/hooks/useNetworkStats';
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
import useWatchedTotals from '@/hooks/useWatchedTotals';
import { netApr, weightedCommission } from '@/utils/staking-apr';
import { getQuiet } from '@/utils/api';
import { proposalKind, relativeClock } from '@/utils/governance-view';

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

/** "2h", "3d" — how the design dates a row whose time column is narrow. */
const ago = (iso: string) => {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d` : `${Math.round(days / 30)}mo`;
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
  const { stats: net, isLoading: netLoading } = useNetworkStats();
  const { validators, activeValidators, apr, bondedTokens, isLoading: validatorsLoading } = useStaking();
  const { params: chainParams } = useChainParams();
  const logos = useValidatorLogos(activeValidators);
  const watchedTotals = useWatchedTotals(hub.watched.map((w) => w.address));

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
      // The card says "net APR", so it has to be the net figure — the same one
      // the network card and the staking screen show, not the chain's gross.
      const yieldApr = netApr(Number(apr) || null, activeValidators) ?? 0;
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
          value: yieldApr ? lume(staked * (yieldApr / 100), 0) : '—',
          foot: yieldApr ? `LUME · at ${yieldApr.toFixed(1)}% net APR` : 'awaiting the chain',
          deltaTone: 'flat',
        },
      ];
    }

    /*
     * What a delegator actually earns, which is what the design shows.
     *
     * The gross figure is inflation over the bonded ratio. A delegator never
     * sees that: the community tax comes off the top, and their validator
     * keeps its commission. Weighting commission by stake rather than
     * averaging it flat matters — a large validator's rate applies to far more
     * of the network than a small one's.
     */
    const avgCommission = weightedCommission(activeValidators);
    const netAprPercent = netApr(net.aprPercent, activeValidators);

    /*
     * useStaking splits the set in two: activeValidators is the bonded set,
     * and `validators` is everything else — unbonding plus unbonded. So the
     * registered total is the two added together, and the waiting count is
     * simply the second list.
     *
     * This previously read `validators.length` as the registered total, which
     * is the inactive count, and derived waiting by subtracting the active set
     * from it — 96 registered and 57 waiting on a testnet that actually has
     * 135 registered and 96 waiting.
     */
    const inactiveCount = validators?.length ?? null;
    const activeCount = activeValidators?.length ?? null;
    const registered =
      inactiveCount != null && activeCount != null ? inactiveCount + activeCount : null;
    const waiting = inactiveCount;

    // Every figure below comes from the chain, and renders an em dash when it
    // did not load rather than a plausible-looking zero.
    return [
      {
        label: 'BONDED STAKE',
        value: net.bondedMicro ? compact(net.bondedMicro / RATE_VALUE) : '—',
        foot:
          net.bondedPercent != null && net.totalSupplyMicro
            ? `${net.bondedPercent.toFixed(1)}% of ${compact(net.totalSupplyMicro / RATE_VALUE)} supply`
            : 'bonded across the active set',
        delta: net.bondedMicro ? 'live' : '',
        deltaTone: 'flat',
      },
      {
        label: 'STAKING APR',
        value: netAprPercent != null ? `${netAprPercent.toFixed(1)}%` : '—',
        foot:
          avgCommission != null && net.communityTaxPercent != null
            ? `net of ${(avgCommission * 100).toFixed(1)}% commission and ${net.communityTaxPercent.toFixed(0)}% community tax`
            : 'net of validator commission',
        delta: netAprPercent != null ? 'live' : '',
        deltaTone: 'flat',
      },
      {
        label: 'ACTIVE VALIDATORS',
        value: net.activeValidators != null ? String(net.activeValidators) : '—',
        tone: 'green',
        delta: waiting != null ? `${waiting} waiting` : '',
        deltaTone: 'flat',
        foot:
          registered != null
            ? `${registered.toLocaleString('en-US')} registered validators`
            : 'active set',
      },
      {
        label: 'BLOCK TIME',
        value: net.blockTimeSeconds != null ? `${net.blockTimeSeconds.toFixed(2)}s` : '—',
        foot:
          net.blockTimeSeconds != null
            ? `mean over the last ${BLOCK_TIME_SAMPLE.toLocaleString('en-US')} blocks`
            : 'awaiting the chain',
        delta: net.blockTimeSeconds != null ? 'live' : '',
        deltaTone: 'flat',
      },
    ];
  }, [
    accountInfo?.delegations?.length,
    activeValidators,
    apr,
    hub.hasPosition,
    liquid,
    rewards,
    staked,
    net,
    unbonding,
    validators,
  ]);

  /*
   * With a position this lists the reader's delegations; without one it lists
   * the top of the active set, so the card is never an empty box.
   */
  const allocations: AllocationRow[] = useMemo(() => {
    if (hub.hasPosition && accountInfo?.delegations?.length) {
      const rows = accountInfo.delegations
        .map((d) => {
          // Both halves: a delegation is usually to a bonded validator, and
          // `validators` holds only the inactive ones, so searching it alone
          // left every active delegation showing a raw operator address.
          const validator =
            activeValidators?.find(
              (v) => v.operator_address === d.delegation.validator_address,
            ) ??
            validators?.find((v) => v.operator_address === d.delegation.validator_address);
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
          when: tx.timestamp ? ago(tx.timestamp) : '',
          direction: /Receive|WithdrawDelegatorReward/.test(kind) ? 'in' : 'out',
          onOpen: () => hub.openDrawer({ kind: 'txdetail', hash: tx.txhash }),
        } as ActivityRow;
      }),
    [hub, recentActivityData.recentActivity],
  );

  const live: IProposal | undefined = useMemo(
    () => (proposals.proposalsInfo || []).find((p) => isVotingOpen(p.status)),
    [proposals.proposalsInfo],
  );

  // `final_tally_result` sits at zero until voting closes. The running count
  // lives at /tally, which is what the governance screens read, so the card
  // showed 0% Yes on a proposal the list had at 100%.
  const [liveTally, setLiveTally] = useState<IProposal['final_tally_result'] | null>(null);
  useEffect(() => {
    setLiveTally(null);
    if (!live?.id) return;
    let cancelled = false;
    getQuiet(`/cosmos/gov/v1/proposals/${live.id}/tally`)
      .then((res) => {
        if (!cancelled && res?.data?.tally) setLiveTally(res.data.tally);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [live?.id]);

  const proposal: OpenProposal | null = useMemo(() => {
    if (!live) return null;
    const tally = liveTally ?? live.final_tally_result;
    const counts = [
      Number(tally?.yes_count) || 0,
      Number(tally?.no_count) || 0,
      Number(tally?.abstain_count) || 0,
      Number(tally?.no_with_veto_count) || 0,
    ];
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    const pct = (n: number) => (n / total) * 100;
    return {
      id: `#${live.id}`,
      // The same readable kind and clock the governance list prints.
      kind: proposalKind(live),
      title: live.title,
      clock: relativeClock(live, 'Voting') || 'Voting open',
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
  }, [bondedTokens, chainParams.quorum, hub, live, liveTally, router]);

  return (
    <>
      <Helmet>
        <title>Dashboard - Lumera Hub</title>
      </Helmet>
      <DashboardScreen
        loading={hub.hasPosition ? loading : validatorsLoading}
        statsLoading={netLoading}
        stats={dashboardStats}
        watchedTotals={watchedTotals}
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
