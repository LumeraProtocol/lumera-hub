import {
  Card,
  Select,
  XStack,
  Tooltip,
} from 'tamagui';
import {
  Copy,
  ChevronDown,
  CheckIcon,
  CircleUser,
  Heart,
} from 'lucide-react';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import useSupernodes, { STATUS_OPTIONS, STATE_OPTIONS } from '@/hooks/useSupernodes';
import {
  formatBytes,
  formatNumber,
  formatAddress,
  formatTokenDisplay,
} from '@/utils/format';
import { TSupernode } from '@/types';
import { RATE_VALUE } from '@/contants';

const formatBigIntToLume = (value: bigint | null, exponent: number, maxFractionDigits = 4) => {
    if (value === null) return '—';
    if (exponent <= 0) return value.toString();
    const factor = 10n ** BigInt(exponent);
    const whole = value / factor;
    const rem = value - whole * factor; // remainder in ulume
    if (rem === 0n) return whole.toString();
    // Build the fractional part as a zero-padded string, then trim trailing
    // zeros and limit to maxFractionDigits significant digits.
    let frac = rem.toString().padStart(exponent, '0');
    if (frac.length > maxFractionDigits) frac = frac.slice(0, maxFractionDigits);
    frac = frac.replace(/0+$/, '');
    if (!frac) return whole.toString();
    return `${whole.toString()}.${frac}`;
}

const formatEta = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'due now';
  const s = Math.floor(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `in ~${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `~${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `~${minutes}m ${secs}s`;
  return `~${secs}s`;
}

export const SupernodesScreen = () => {
  const {
    isSupernodeLoading,
    supernodes,
    isStatsLoading,
    supernodesStats,
    isSupernodeAccountLoading,
    supernodeAccount,
    isPoolStateLoading,
    poolState,
    isMatrixLoading,
    matrix,
    isActionsStatsLoading,
    actionsStats,
    validators,
    smoothedWeight,
    isSmoothedWeightLoading,
    participationPercent,
    eligibilityMap,
    lumeExponent,
    statusFilter,
    stateFilter,
    versionFilter,
    myFavorites,
    tab,
    listSuperNodes,
    supernodeBalances,
    scheduleError,
    nextPayoutHeight,
    blocksRemaining,
    etaSecondsApprox,
    isTopSupernodeLoading,
    handleTabChange,
    toggleFavorite,
    handleStatusFilterChange,
    handleStateFilterChange,
    handleVersionFilterChange,
    handleRefresh,
  } = useSupernodes();

  const getFreeStorageBytes = () => {
    if (!supernodesStats) {
      return '0';
    }

    return formatBytes(supernodesStats.available_storage_bytes, 1);
  }

  const getGlobalSuccessRate = () => {
    if (!actionsStats) {
      return '0%';
    }

    const done = actionsStats.states?.ACTION_STATE_DONE || 0;
    const approved = actionsStats.states?.ACTION_STATE_APPROVED || 0;
    return `${(((done + approved) / actionsStats.total) * 100).toFixed(1)}%`;
  }

  const getAverageRamGb = () => {
    if (!supernodesStats) {
      return '0';
    }
    const mem = supernodesStats.total_memory_gb;
    const cnt = supernodesStats.available_supernodes;
    if (!mem || !cnt) return '0';
    return (mem / cnt).toFixed(2);
  }

  const getVersionCompliancePercentage = () => {
    if (!supernodes?.length || !matrix) {
      return '0';
    }
    const latestVersion = matrix.latest_version;
    const total = supernodes.length;
    const compliant = supernodes.filter(n => (n.actual_version || '').toLowerCase() === latestVersion.toLowerCase()).length;
    return ((compliant / total) * 100).toFixed(1);
  }

  const logo = (identity?: string) => {
    const cache = localStorage.getItem('supernode-avatars');
    try {
      if (cache) {
        const parseCache = JSON.parse(cache);
        if (!identity || !parseCache[identity]) return '';
        const url = parseCache[identity] || '';
        return url.startsWith('http')
          ? url
          : `https://s3.amazonaws.com/keybase_processed_uploads/${url}`;
      }
    } catch (err) {
      console.error(err);
    }
    return '';
  };


  const latestChainState = (supernode_account: string) => {
    if (!listSuperNodes || !supernode_account) {
      return null
    }
    const item = listSuperNodes[supernode_account];
    const states =  item.states;
    return states?.length ? `#${states[states.length - 1].state}` : '';
  }

  const getState = (supernode: TSupernode) => {
    if (!supernode) {
      return 'Unknown'
    }
    const lastSate = latestChainState(supernode.supernode_account);
    const state = (supernode?.current_state || lastSate)?.replaceAll('SUPERNODE_STATE_', '') || '';
    if (state === 'POSTPONED') {
      return (
        <span className="block badge capitalize bg-lumera-warning rounded-lg py-1.5 px-3 text-[12px] text-lumera-navy w-[86px] text-center">
          {state.toLowerCase()}
        </span>
      );
    }
    if (state === 'DISABLED') {
      return (
        <span className="block badge capitalize bg-lumera-red rounded-lg py-1.5 px-3 text-[12px] w-[86px] text-center">
          {state.toLowerCase()}
        </span>
      );
    }
    return (
      <span className="block badge capitalize bg-lumera-teal rounded-lg py-1.5 px-3 text-[12px] w-[86px] text-center">
        {state.toLowerCase()}
      </span>
    );
  }

  const allVersions = matrix?.versions?.sort((a, b) => b.version.localeCompare(a.version)) || [];

  const getPoolBalanceUlume = () => {
    if (!poolState) {
      return 0;
    }

    let poolBalanceUlume = 0;
    for (const item of poolState.balance) {
      if (item.denom === 'ulume') {
        poolBalanceUlume += Number(item.amount);
      }
    }

    return poolBalanceUlume;
  }

  const getPoolState = () => {
    if (isPoolStateLoading) {
      return '--';
    }
    if (!poolState) {
      return `Pool unavailable`;
    }

    let poolBalanceUlume = getPoolBalanceUlume();
    if (!poolBalanceUlume) {
      return `No funded payout`;
    }

    return `${formatTokenDisplay({
      amount: poolBalanceUlume.toString(),
      denom: 'ulume'
    })} LUME`;
  }

  const getStorageUsagePercentClassName = (storage_usage_percent: number) => {
    if (storage_usage_percent <= 60) {
      return 'bg-lumera-teal';
    }
    if (storage_usage_percent > 60 && storage_usage_percent <= 80) {
      return 'bg-lumera-warning';
    }
    if (storage_usage_percent > 80) {
      return 'bg-lumera-red';
    }
  }

  const getP2pBytes = (mb: number | null) => {
    if (mb === undefined || mb === null || isNaN(mb as any)) return null;
    return Number(mb) * 1024 * 1024; // MB -> bytes
  }

  const getP2pLeftPercent = (total: number, usedPct: number, p2p_db_size_mb: number) => {
    const p2p = getP2pBytes(p2p_db_size_mb) || 0;
    if (!total || !p2p) return 0;
    const pos = (p2p / total) * 100;
    // Clamp to used percent so marker stays within the filled bar
    const clamped = Math.min(pos, usedPct);
    return Math.max(0, Math.min(clamped, 100));
  }

  // Compact formatter for record counts (e.g., 1.2M)
  const formatCount = (n?: number | null) => {
    if (n === null || n === undefined || isNaN(n as any)) return 'N/A';
    const num = Number(n);
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
    if (abs >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
    if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
  }

  const getP2pLabel = (p2p_db_size_mb: number, p2p_records: number) => {
    const b = getP2pBytes(p2p_db_size_mb);
    if (!b) return '';
    const rec = p2p_records;
    const parts: string[] = [formatBytes(b)];
    if (rec !== undefined && rec !== null && !isNaN(rec as any)) parts.push(`${formatCount(rec)} records`);
    return `P2P DB: ${parts.join(' • ')}`;
  }

  const getParticipationPercent = (address?: string) => {
    if (!address || !actionsStats || !participationPercent) return 'N/A';
    const globalDone = actionsStats.states?.ACTION_STATE_DONE || 0;
    const globalApproved = actionsStats.states?.ACTION_STATE_APPROVED || 0;
    const globalTotalOk = globalDone + globalApproved;
    const entry = participationPercent[address];
    if (!entry || !globalTotalOk) {
      return 'N/A';
    }
    const done = entry?.ACTION_STATE_DONE || 0;
    const approved = entry?.ACTION_STATE_APPROVED || 0;
    const percent = ((done + approved) / globalTotalOk) * 100;
    return percent ? `${percent.toFixed(2)}%` : '0.00%';
  }

  const everlightStatus = (account: string) => {
    const e = eligibilityMap[account];
    if (!e) return 'none';
    return e.status;
  }

  const everlightError = (account: string) => {
    const e = eligibilityMap[account];
    return e && e.status === 'error' ? (e.err || 'fetch failed') : '';
  }

  const everlightEligible = (account: string) => {
    const e = eligibilityMap[account];
    return !!(e && e.status === 'ok' && e?.data?.eligible);
  }

  const everlightReason = (account: string) => {
    const e = eligibilityMap[account];
    return e && e.status === 'ok' ? (e?.data?.reason || '') : '';
  }

  const everlightWeight = (account: string) => {
    const e = eligibilityMap[account];
    return e && e.status === 'ok' ? e?.data?.smoothed_weight : 0n;
  }

  const everlightBytes = (account: string) => {
    const e = eligibilityMap[account];
    return e && e.status === 'ok' ? e?.data?.cascade_kademlia_db_bytes : 0n;
  }

  const getPayoutByAccount = (account: string) => {
    const total = smoothedWeight;
    const pool = getPoolBalanceUlume();
    const entry = eligibilityMap[account];
    if (!entry || entry.status !== 'ok' || !entry?.data?.eligible || !entry?.data?.smoothed_weight) {
      return 0n;
    }
    return (BigInt(pool) * entry.data.smoothed_weight) / BigInt(total);
  }

  const getEverlightPayout = (supernode: TSupernode) => {
    if (everlightStatus(supernode.validator_address) === 'none' || everlightStatus(supernode.validator_address) === 'loading') {
      return (
        <AppLoading
          isLoading
          className="w-10 h-10 !border-2"
          iconWidth={20}
          iconHeight={20}
          containerClassName='relative w-10 h-10 z-50'
        />
      );
    }

    if (everlightStatus(supernode.validator_address) === 'error') {
      return (
        <>
          <Tooltip>
            <Tooltip.Trigger>
              <span className="block badge capitalize bg-lumera-red rounded-lg py-1.5 px-3 text-[12px] w-[86px] text-center">
                Unavailable
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content
              enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
              exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
              scale={1}
              x={0}
              y={0}
              opacity={1}
              animation={[
                'quick',
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
            >
              <div className='text-white'>
                {everlightError(supernode.validator_address)}
              </div>
            </Tooltip.Content>
          </Tooltip>
          <div className="text-xs text-gray-400 mt-1">—</div>
        </>
      );
    }

    if (everlightStatus(supernode.validator_address) === 'ok' && !everlightEligible(supernode.validator_address)) {
      return (
        <>
          <Tooltip>
            <Tooltip.Trigger>
              <span className="block badge capitalize bg-lumera-warning rounded-lg py-1.5 px-3 text-lumera-navy text-[12px] w-[86px] text-center">
                Ineligible
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content
              enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
              exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
              scale={1}
              x={0}
              y={0}
              opacity={1}
              animation={[
                'quick',
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
            >
              <div className='text-white'>
                {everlightReason(supernode.validator_address) || 'ineligible'}
              </div>
            </Tooltip.Content>
          </Tooltip>
          <div className="text-xs text-gray-500 mt-1">{everlightReason(supernode.validator_address)}</div>
          <div className="text-xs text-gray-400 mt-1">0 LUME</div>
        </>
      )
    }

    return (
      <>
        <span className="block badge capitalize bg-lumera-teal rounded-lg py-1.5 px-3 text-[12px] w-[86px] text-center">Eligible</span>
        <div className="text-sm font-medium mt-1">
          {formatBigIntToLume(getPayoutByAccount(supernode.validator_address) ?? 0n, lumeExponent)} LUME
        </div>
        <div className="text-xs text-gray-500">
          weight: {everlightWeight(supernode?.validator_address)?.toString()}
        </div>
        <div className="text-xs text-gray-500">
          bytes: {formatBytes(Number(everlightBytes(supernode.validator_address)))}
        </div>
      </>
    );
  }

  const getHeight = (supernode_account: string) => {
    if (!listSuperNodes || !supernode_account) {
      return null
    }
    const item = listSuperNodes[supernode_account];
    const states =  item.states;
    return states?.length ? `#${states[states.length - 1].height}` : '';
  }

  const isLowBalance = (address?: string) => {
    if (!address) return false;
    const b = supernodeBalances[address]?.amount;
    if (b == null) return false;
    return b / RATE_VALUE < 1; // < 1 LUME in micro
  }

  const getNextPayout = () => {
    const poolBalanceUlume = getPoolBalanceUlume();
    if (!poolBalanceUlume) {
      return null;
    }

    if (scheduleError) {
      return (
        <div className="text-xs text-gray-500 mt-3">
          Schedule unavailable
        </div>
      );
    }

    if (nextPayoutHeight && blocksRemaining) {
      return (
        <div className="text-xs text-gray-500 mt-3">
          <span className="text-gray-500">Next payout:</span>
          {!blocksRemaining ?
            <>
              <span className="font-semibold ml-1">due now</span>
              <span className="text-xs text-lumera-gray ml-2">(Block {nextPayoutHeight.toString()})</span>
            </> : <>
              <span className="font-semibold ml-1 text-lumera-gray">Block {nextPayoutHeight.toString()}</span>
              {etaSecondsApprox ?
                <span className="text-xs text-gray-500 ml-2">
                  ({formatEta(etaSecondsApprox)})
                </span> : null
              }
            </>
          }
          <div className="text-xs text-gray-500 mt-1">
              {blocksRemaining.toString()} blocks remaining
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-0'>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isMatrixLoading || isStatsLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <SectionTitle className='mb-0'>Version Compliance</SectionTitle>
          <div className='mt-3'>
            <div>
              <span className='text-lumera-green font-bold text-2xl'>{getVersionCompliancePercentage()}%</span> <span className="text-base text-lumera-label">on {matrix?.latest_version}</span>
            </div>
            <ul className='mt-3 text-sm'>
              {allVersions?.map((item) => (
                <li className={`flex justify-between mb-1 ${item.version === matrix?.latest_version ? 'text-lumera-gray' : 'text-lumera-label'}`} key={item.version}>
                  <span>{item.version}</span>
                  <span>{item.nodes_total} nodes</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isStatsLoading || isActionsStatsLoading || isSupernodeLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <SectionTitle className='mb-0'>Nodes Online</SectionTitle>
          <div className='mt-3'>
            <span className='text-lumera-gray font-bold text-2xl'>{supernodesStats?.available_supernodes}</span> <span className="text-base text-lumera-label">/ {supernodes.length}</span>
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <SectionTitle className='mb-0'>Global Actions</SectionTitle>
          <div className='mt-3'>
            <div>
              <span className='text-lumera-gray font-bold text-2xl'>
                {actionsStats?.total ? formatNumber(actionsStats.total, { decimalsLength: 0 }) : '0'}
              </span>
            </div>
            <div className='mt-3'>
              <span className="text-sm text-lumera-label">Success Rate: {getGlobalSuccessRate()}</span>
            </div>
            <div className='mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-lumera-label text-sm'>
              <ul>
                <li className='flex justify-between mb-1'>
                  <span>Done</span>
                  <span>{actionsStats?.states?.ACTION_STATE_DONE ? formatNumber(actionsStats?.states?.ACTION_STATE_DONE, { decimalsLength: 0 }) : '0'}</span>
                </li>
                <li className='flex justify-between mb-1'>
                  <span>Pending</span>
                  <span>{actionsStats?.states?.ACTION_STATE_PENDING ? formatNumber(actionsStats?.states?.ACTION_STATE_PENDING, { decimalsLength: 0 }) : '0'}</span>
                </li>
              </ul>
              <ul>
                <li className='flex justify-between mb-1'>
                  <span>Approved</span>
                  <span>{actionsStats?.states?.ACTION_STATE_APPROVED ? formatNumber(actionsStats?.states?.ACTION_STATE_APPROVED, { decimalsLength: 0 }) : '0'}</span>
                </li>
                <li className='flex justify-between mb-1'>
                  <span>Expired</span>
                  <span>{actionsStats?.states?.ACTION_STATE_EXPIRED ? formatNumber(actionsStats?.states?.ACTION_STATE_EXPIRED, { decimalsLength: 0 }) : '0'}</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isStatsLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <SectionTitle className='mb-0'>Total CPU</SectionTitle>
          <div className='mt-3'>
            <span className='text-lumera-gray font-bold text-2xl'>{supernodesStats?.total_cpu_cores}</span> <span className="text-base text-lumera-label">cores</span>
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <SectionTitle className='mb-0'>Average RAM</SectionTitle>
          <div className='mt-3'>
            <span className='text-lumera-gray font-bold text-2xl'>{getAverageRamGb()}</span> <span className="text-base text-lumera-label">GB</span>
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isStatsLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <SectionTitle className='mb-0'>Total Storage</SectionTitle>
          <div className='mt-3'>
            <div>
              <span className='text-lumera-gray font-bold text-2xl'>{supernodesStats?.total_storage_bytes ? formatBytes(supernodesStats?.total_storage_bytes, 1) : '0'}</span>
            </div>
            <div className='mt-3'>
              <span className="text-sm text-lumera-label">{supernodesStats?.storage_used_percent ? supernodesStats?.storage_used_percent.toFixed(1) : '0'}% used • {getFreeStorageBytes()} free</span>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-6">
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <SectionTitle className='mb-0 flex flex-col sm:flex-row items-start sm:items-end gap-2'>
            <span>Everlight Pool</span>
            <span className='text-sm text-lumera-label font-normal'>Cascade retention payout estimates</span>
          </SectionTitle>
          <div className='mt-3'>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <li className='relative'>
                <AppLoading
                  isLoading={isPoolStateLoading}
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                />
                <div className='text-lumera-label'>Pool balance</div>
                <div className='text-lumera-gray font-bold text-2xl'>{getPoolState()}</div>
                <div className='text-lumera-label text-sm'>{getPoolBalanceUlume()} ulume</div>
              </li>
              <li className='relative'>
                <AppLoading
                  isLoading={isSupernodeAccountLoading}
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                />

                <div className='text-lumera-label'>x/supernode module account</div>
                <div className='text-lumera-gray flex items-center gap-2'>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <span>
                        {supernodeAccount?.base_account?.address ? formatAddress(supernodeAccount?.base_account?.address, 12, -6) : '--'}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                      exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                      scale={1}
                      x={0}
                      y={0}
                      opacity={1}
                      animation={[
                        'quick',
                        {
                          opacity: {
                            overshootClamping: true,
                          },
                        },
                      ]}
                    >
                      <div className='text-white'>
                        {supernodeAccount?.base_account?.address}
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                  <button className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
                    <Copy className="w-4 h-4"/>
                  </button>
                </div>
              </li>
              <li className='relative'>
                <AppLoading
                  isLoading={isPoolStateLoading}
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                />
                <div className='text-lumera-label'>Eligible SuperNodes</div>
                <div className='text-lumera-gray font-bold text-2xl'>{poolState?.eligible_sn_count}</div>
                <div className='text-lumera-label text-sm'>across visible rows</div>
              </li>
              <li className='relative'>
                <AppLoading
                  isLoading={isSmoothedWeightLoading}
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                />
                <div className='text-lumera-label'>Total smoothed weight</div>
                <div className='text-lumera-gray font-bold text-2xl'>{smoothedWeight}</div>
                <div className='text-lumera-label text-sm'>{formatBytes(smoothedWeight)} (display only)</div>
              </li>
            </ul>
          </div>
          {getNextPayout()}
        </Card>
      </div>
      <div className="mt-6">
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <SectionTitle className='mb-0 flex flex-col sm:flex-row items-start sm:items-end gap-2'>
            <span>Uptime Heatmap</span>
            <span className='text-sm text-lumera-label font-normal'>Node availability over the last 30 days</span>
          </SectionTitle>
          <Card elevate size="$4" bordered className='w-full estimated-rewards-card mt-3 p-6'>
            <div className="mb-2 text-sm text-center">Uptime Heatmap Panel</div>
            <div className="text-xs text-center">[Placeholder for embedded uptime heatmap panel]</div>
          </Card>
        </Card>
      </div>
      <div className="mt-6">
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isSupernodeLoading || isTopSupernodeLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-6'>
            <ul className='flex !gap-0 list-none tabs overflow-auto'>
              <li className={`tab-item ${tab === 'top' ? 'active' : ''}`}>
                <button
                  className='tab-button cursor-pointer px-6 whitespace-nowrap'
                  onClick={() => handleTabChange('top')}
                >
                  Top 10
                </button>
              </li>
              <li className={`tab-item ${tab === 'all' ? 'active' : ''}`}>
                <button
                  className='tab-button cursor-pointer px-6'
                  onClick={() => handleTabChange('all')}
                >
                  All
                </button>
              </li>
              <li className={`tab-item ${tab === 'favorites' ? 'active' : ''}`}>
                <button
                  className='tab-button cursor-pointer px-6'
                  onClick={() => handleTabChange('favorites')}
                >
                  Favorites
                </button>
              </li>
            </ul>
            <div className='text-lumera-label'>
              {supernodes.length} Supernodes
            </div>
          </div>
          <div className='flex justify-between items-center gap-6 mt-6'>
            <div className='text-lumera-label hidden md:block'>
              Filters
            </div>
            <div className='w-full grid grid-cols-1 tiny:grid-cols-2 sm:flex justify-end items-center flex-wrap gap-3'>
              <div className='w-full sm:w-36'>
                <Select
                  id="statusFilter"
                  value={statusFilter}
                  onValueChange={(newValue) => handleStatusFilterChange(newValue)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder={STATUS_OPTIONS[0].label} />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={140}>
                      <Select.Group>
                        {STATUS_OPTIONS.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.value}
                            value={item.value}
                          >
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
              </div>
              <div className='w-full sm:w-36'>
                <Select
                  id="stateFilter"
                  value={stateFilter}
                  onValueChange={(newValue) => handleStateFilterChange(newValue)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder={STATE_OPTIONS[0].label} />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={140}>
                      <Select.Group>
                        {STATE_OPTIONS.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.value}
                            value={item.value}
                          >
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
              </div>
              <div className='w-full sm:w-56'>
                <Select
                  id="versionFilter"
                  value={versionFilter}
                  onValueChange={(newValue) => handleVersionFilterChange(newValue)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder={STATE_OPTIONS[0].label} />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={120}>
                      <Select.Group>
                        <Select.Item
                          index={0}
                          value='all'
                        >
                          <Select.ItemText>All Versions</Select.ItemText>
                          <XStack flex={1} />
                          <Select.ItemIndicator marginLeft="auto">
                            <CheckIcon size={16} />
                          </Select.ItemIndicator>
                        </Select.Item>
                        {allVersions.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.version}
                            value={item.version}
                          >
                            <Select.ItemText>{item.version} ({item.nodes_total})</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
              </div>
              <div className='w-full sm:w-auto'>
                <AppButton onClick={handleRefresh}>
                  Refresh
                </AppButton>
              </div>
            </div>
          </div>
          <div className='overflow-x-auto mt-6'>
            <table className='w-full table !min-w-[950px]'>
              <thead className='hidden md:table-header-group text-sm'>
                <tr className='text-sm'>
                  <th align='left' className='text-lumera-label'>Supernode</th>
                  <th align='left' className='text-lumera-label whitespace-nowrap'>IP Address</th>
                  <th align='left' className='text-lumera-label'>State</th>
                  <th align='left' className='text-lumera-label whitespace-nowrap'>Actual Version</th>
                  <th align='left' className='text-lumera-label'>Status</th>
                  <th align='left' className='text-lumera-label'>Hardware</th>
                  <th align='left' className='text-lumera-label whitespace-nowrap'>Storage Usage</th>
                  <th align='left' className='text-lumera-label'>Participation</th>
                  <th align='left' className='text-lumera-label whitespace-nowrap'>Est. Payout</th>
                  <th align='left' className='text-lumera-label'>Favorite</th>
                </tr>
              </thead>
              <tbody>
                {supernodes?.map((supernode, index) => {
                  const validator = validators.find((v) => v.operator_address === supernode.validator_address);

                  return (
                    <tr
                      key={supernode.supernode_account}
                      className={`${index % 2 === 0 ? '!bg-gray-900' : ''} flex flex-col md:table-row text-sm`}
                    >
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Supernode:</div>
                        <div className='flex items-center gap-2'>
                          {validator?.description?.identity ?
                            <img
                              src={logo(validator.description?.identity)}
                              alt="avatar"
                              className='w-6 h-6 rounded-full'
                            /> :
                            <CircleUser className="w-6 h-6"/>
                          }
                          <span className='whitespace-nowrap'>{validator?.description?.moniker || supernode.validator_moniker}</span>
                        </div>
                        <div className='text-lumera-label text-sm flex items-center gap-2 mt-2 whitespace-nowrap'>
                          <span>SN: {formatAddress(supernode.supernode_account, 12, -6)}</span>
                          <button className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
                            <Copy className="w-4 h-4"/>
                          </button>
                        </div>
                        <div className='text-lumera-label text-sm flex items-center gap-2 whitespace-nowrap'>
                          <span>Val: {formatAddress(supernode.validator_address, 12, -6)}</span>
                          <button className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
                            <Copy className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>IP Address:</div>
                        <span>{supernode.ip_address}</span>
                      </td>
                      <td className='cursor-pointer text-left md:text-center'>
                        <div className='block md:hidden text-lumera-label mb-1'>State:</div>
                        <div>
                          {getState(supernode)}
                          <div className='mt-2 text-[10px] text-lumera-label'>
                            {getHeight(supernode.supernode_account)}
                          </div>
                          {isLowBalance(supernode.supernode_account) ?
                            <Tooltip>
                              <Tooltip.Trigger>
                                <span className="text-[11px] text-lumera-red mt-1">low balance</span>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                scale={1}
                                x={0}
                                y={0}
                                opacity={1}
                                animation={[
                                  'quick',
                                  {
                                    opacity: {
                                      overshootClamping: true,
                                    },
                                  },
                                ]}
                              >
                                <div className='text-white'>
                                  Required minimum for SN: 1 LUME
                                </div>
                              </Tooltip.Content>
                            </Tooltip> : null
                          }
                        </div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-2'>Actual Version:</div>
                        <span className='py-1.5 px-3 rounded-lg border border-lumera-label text-lumera-label text-sm'>{supernode.actual_version || '—'}</span>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Status:</div>
                        <span className={supernode.is_status_api_available ? 'text-lumera-teal' : 'text-lumera-red'}>{supernode.is_status_api_available ? 'Online' : 'Offline'}</span>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Hardware:</div>
                        <div className='whitespace-nowrap'>• {supernode.metrics_report.status.CPUCores} cores</div>
                        <div className='whitespace-nowrap'>• {supernode.metrics_report.status.MemoryTotalGb.toFixed(1)} GB RAM</div>
                        <div className='whitespace-nowrap'>• {formatBytes(supernode.metrics_report.status.StorageTotalBytes)} total</div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Storage Usage:</div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium whitespace-nowrap">
                            {formatBytes(supernode.storage_used_bytes)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(supernode.storage_usage_percent ?? 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-40 bg-lumera-icon-bg rounded h-2 relative">
                          <div
                            className={`h-2 rounded ${getStorageUsagePercentClassName(supernode.storage_usage_percent)}`}
                            style={{ width: Math.min(supernode.storage_usage_percent || 0, 100) + '%' }}
                          />
                          {getP2pBytes(supernode?.p2p_db_size_mb) ?
                            <Tooltip>
                              <Tooltip.Trigger>
                                <div
                                  className='absolute -top-3 w-2 h-2 rounded-full bg-lumera-blue-light border border-white tooltip tooltip-info'
                                  style={{ left: getP2pLeftPercent(supernode.storage_total_bytes, supernode.storage_usage_percent, supernode.p2p_db_size_mb) + '%' }}
                                />
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                scale={1}
                                x={0}
                                y={0}
                                opacity={1}
                                animation={[
                                  'quick',
                                  {
                                    opacity: {
                                      overshootClamping: true,
                                    },
                                  },
                                ]}
                              >
                                <div className='text-white'>
                                  {getP2pLabel(supernode.p2p_db_size_mb, supernode.p2p_records)}
                                </div>
                              </Tooltip.Content>
                            </Tooltip> : null
                          }
                        </div>
                        {getP2pBytes(supernode?.p2p_db_size_mb) ?
                          <div className="text-xs text-gray-400 mt-1">
                            <div className='whitespace-nowrap'>
                              P2P DB: {formatBytes(getP2pBytes(supernode?.p2p_db_size_mb) || 0)}
                            </div>
                            {supernode.p2p_records !== null ?
                              <div className='whitespace-nowrap'>
                                {formatCount(supernode.p2p_records)} records
                              </div> : null
                            }
                          </div> : null
                        }
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Participation:</div>
                        {getParticipationPercent(supernode.supernode_account)}
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Est. Payout:</div>
                        {getEverlightPayout(supernode)}
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Favorite:</div>
                        <AppButton
                          className='!rounded-full !p-2'
                          variant='ghost'
                          onClick={() => toggleFavorite(supernode.supernode_account)}
                        >
                          <Heart className={`w-6 h-6  ${myFavorites?.includes(supernode.supernode_account) ? 'fill-lumera-red border-lumera-red stroke-lumera-red' : 'stroke-lumera-label'}`} />
                        </AppButton>
                      </td>
                    </tr>
                  )
                })}
                {!supernodes?.length ?
                  <tr
                    className={`flex flex-col md:table-row text-sm`}
                  >
                    <td className='cursor-pointer text-left' colSpan={10}>
                      <div className="text-xl font-bold py-0">No data</div>
                    </td>
                  </tr> : null
                }
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
