import {
  Card,
  Button,
  Tooltip,
} from 'tamagui';
import dayjs from 'dayjs';
import {
  Info,
  ChevronDown,
  ChevronUp,
  History,
  Network,
  ChartColumnIncreasing,
  BadgeAlert,
  Copy,
  CircleUser,
  ChartLine,
  CircleCheck,
  CircleX,
  Tag,
  Users,
  Clock4,
  WalletCards,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  ChevronLeft,
} from 'lucide-react';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import AppLink from '@/components/AppLink';
import AppButton from '@/components/AppButton';
import useSupernodeDetails from '@/hooks/useSupernodeDetails';
import {
  formatAddress,
  formatNumber,
  formatTokenDisplay,
  formatBytes,
} from '@/utils/format';
import { TSupernode } from '@/types';

const parseHostAndPort = (addr?: string): { host: string; port: number | null } => {
  const s = (addr || '').trim();
  if (!s) return { host: '', port: null };
  // Bracketed IPv6 with optional port: [::1]:1234
  const m = s.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (m) {
    const host = m[1];
    const port = m[2] ? Number(m[2]) : null;
    return { host: host, port: Number.isFinite(port as any) ? (port as number) : null };
  }
  // If contains multiple colons -> likely IPv6 without port
  if ((s.match(/:/g) || []).length > 1) {
    return { host: s, port: null };
  }
  // IPv4 or hostname, possibly with port
  const idx = s.lastIndexOf(':');
  if (idx > 0) {
    const host = s.slice(0, idx);
    const portStr = s.slice(idx + 1);
    const p = Number(portStr);
    return { host, port: Number.isFinite(p) ? p : null };
  }
  return { host: s, port: null };
}

const formatUptime = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null) return '—';
  const s = Number(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

const formatLume = (n?: number | null, digits = 2) => {
  if (n == null || !isFinite(n)) return '—';
  return `${n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })} LUME`;
}

const toNumberSafe = (s?: string) => { return s ? Number(s) : 0; }

const formatAmountString = (amount?: string) => {
  if (!amount) return '';
  const n = Number(amount);
  if (!isFinite(n)) return amount;
  return n.toLocaleString();
}

const formatPercent = (n?: number | null, digits = 1) => {
  if (n === null || n === undefined || isNaN(n as any)) return '—';
  return `${Number(n).toFixed(digits)}%`;
}

const formatCount = (n?: number | null) => {
  if (n === null || n === undefined || isNaN(n as any)) return 'N/A';
  const num = Number(n);
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
}

// Minimum hardware requirements for visual cues
const MIN_CPU_CORES = 8;
const MIN_MEMORY_GB = 16;
// Use decimal TB for comparison to match UI expectation (1 TB = 10^12 bytes)
const MIN_STORAGE_BYTES = 10 ** 12; // 1 TB

export const SupernodeDetailsScreen = () => {
  const {
    isLoading,
    supernode,
    isRecentActivityLoading,
    recentActivities,
    isCascadeActionLoading,
    cascadeAction,
    isSenseActionLoading,
    senseAction,
    showMoreInfo,
    extraMetrics,
    isValidatorLoading,
    validator,
    listSuperNodes,
    balances,
    networkActivityPercent,
    metrics,
    paymentInfo,
    lumeExponent,
    recentActivitiesError,
    setShowMoreInfo,
    copyToClipboard,
    handleRefresh,
  } = useSupernodeDetails();

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
    const state = (lastSate || supernode?.current_state)?.replaceAll('SUPERNODE_STATE_', '')?.replaceAll('#', '') || '';
    if (state === 'POSTPONED') {
      return (
        <div className='btn-yellow not-button mt-1 text-[12px] btn-label'>
          <Button className='small !py-1.5 !px-3'>
            <span className='capitalize'>{state.toLowerCase()}</span>
          </Button>
        </div>
      );
    }
    if (state.toLowerCase() === 'storage_full') {
      return (
        <div className='btn-storage-full not-button mt-1 text-[12px] btn-label'>
          <Button className='small'>
            <span className='capitalize whitespace-nowrap'>{state.replaceAll('_', ' ').toLowerCase()}</span>
          </Button>
        </div>
      );
    }
    if (state === 'DISABLED') {
      return (
        <div className='btn-disabled not-button mt-1 text-[12px] btn-label'>
          <Button className='small'>
            <span className='capitalize whitespace-nowrap'>{state.replaceAll('_', ' ').toLowerCase()}</span>
          </Button>
        </div>
      );
    }
    return (
      <div className='btn-green not-button mt-1 text-[12px] btn-label'>
        <Button className='small !py-1.5 !px-3'>
          <span className='capitalize'>{state.toLowerCase()}</span>
        </Button>
      </div>
    );
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

  const p2pOpen = metrics?.metrics_report?.ports?.p2p;
  const apiOpen = metrics?.is_status_api_available;
  const snOpen = metrics?.metrics_report?.ports?.port1;
  const apiPort = 8002;
  const p2pPortEffective = metrics?.metrics_report?.ports?.p2pPort ??
    metrics?.p2p_port ??
    null;

  const buildHostWithPort = (host: string, port?: number | null) => {
    if (!host) return '';
    if (!port && port !== 0) return host;
    // If host is IPv6 literal without brackets, add brackets
    const needsBrackets = host.includes(':') && !host.startsWith('[');
    const h = needsBrackets ? `[${host}]` : host;
    return `${h}:${port}`;
  }

  const ipParsed = parseHostAndPort(metrics?.ip_address || '');
  const hostOnly = ipParsed.host;

  const lumeFactor = Math.pow(10, lumeExponent);

  const actionLume = () => {
    const list = paymentInfo || [];
    const totalMicro = list
      .filter(p => p.denom === 'ulume' && p.total_action_price)
      .reduce((sum, p) => sum + toNumberSafe(p.total_action_price), 0);
    return totalMicro ? totalMicro / lumeFactor : null;
  };

  const feesLume = () => {
    const list = paymentInfo || [];
    const totalMicro = list
      .filter(p => p.denom === 'ulume' && p.total_tx_fee)
      .reduce((sum, p) => sum + toNumberSafe(p.total_tx_fee), 0);
    return totalMicro ? totalMicro / lumeFactor : null;
  };

  const profitLume = () => {
    if (actionLume() == null && feesLume() == null) return null;
    const a = actionLume() || 0;
    const f = feesLume() || 0;
    return a - f;
  };

  const actionRewardsText = () => {
    const list = paymentInfo || [];
    if (!list.length) return '—';
    const parts = list
      .filter(p => p.total_action_price && p.denom)
      .map(p => `${formatAmountString(p.total_action_price)} ${p.denom}`);
    return parts.length ? parts.join(', ') : '—';
  };

  const finalizeFeesText = () => {
    const list = paymentInfo || [];
    if (!list.length) return '—';
    const parts = list
      .filter(p => p.total_tx_fee && p.denom)
      .map(p => `${formatAmountString(p.total_tx_fee)} ${p.denom}`);
    return parts.length ? parts.join(', ') : '—';
  };

  const hardwareSummaryLine = () => {
    const cores = metrics?.cpu_cores;
    const memGb = metrics?.memory_total_gb;
    const total = metrics?.storage_total_bytes;
    const parts: string[] = [];
    if (cores != null) parts.push(`${cores} cores`);
    if (memGb != null) parts.push(`${(memGb || 0).toFixed(0)}GB RAM`);
    if (total != null) parts.push(formatBytes(total));
    return parts.join(' / ');
  };

  const hwCpuBelow = metrics?.cpu_cores != null && (metrics?.cpu_cores as number) < MIN_CPU_CORES;
  const hwMemBelow = metrics?.memory_total_gb != null && (metrics?.memory_total_gb as number) < MIN_MEMORY_GB;
  const hwStorageBelow = metrics?.storage_total_bytes != null && (metrics?.storage_total_bytes as number) < MIN_STORAGE_BYTES;

  const cpuPercent = () => {
    const n = metrics?.cpu_usage_percent as any;
    if (n === null || n === undefined || isNaN(n)) return 0;
    const v = Number(n);
    const pct = v <= 1 ? v * 100 : v;
    return Math.max(0, Math.min(pct, 100));
  };

  const formatCpuPercent = (digits = 1) => `${cpuPercent().toFixed(digits)}%`;

  const getP2pBytes = () => {
    const mb = metrics?.p2p_db_size_mb as any;
    if (mb === undefined || mb === null || isNaN(mb)) return null;
    return Number(mb) * 1024 * 1024; // MB -> bytes
  }

  const getP2pLeftPercent = () => {
    const total = Number(metrics?.storage_total_bytes || 0);
    const usedPct = Number(metrics?.storage_usage_percent || 0);
    const p2p = getP2pBytes() || 0;
    if (!total || !p2p) return 0;
    const pos = (p2p / total) * 100;
    const clamped = Math.min(pos, usedPct);
    return Math.max(0, Math.min(clamped, 100));
  }

  const getP2pLabel = () => {
    const b = getP2pBytes();
    if (!b) return '';
    const rec = metrics?.p2p_records as any;
    const parts: string[] = [formatBytes(b)];
    if (rec !== undefined && rec !== null && !isNaN(rec)) parts.push(`${formatCount(rec)} records`);
    return `P2P DB: ${parts[0]}${parts.length === 2 ? '(' + parts[1] + ')' : ''}`;
  }

  return (
    <div>
      <div>
        <AppLink
          href='/supernodes'
          className="flex items-start gap-2 text-lumera-label hover:text-lumera-green transition-colors mb-4 text-sm"
        >
          <ChevronLeft className="w-5 h-5"/>Back to Supernodes
        </AppLink>
      </div>
      <Card elevate size="$4" bordered className='w-full p-5 relative'>
        <AppLoading
          isLoading={isValidatorLoading || isLoading}
          className="w-10 h-10 !border-2"
          iconWidth={20}
          iconHeight={20}
          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <div className='relative'>
            <AppLoading
              isLoading={isValidatorLoading || isLoading}
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
            <div className="flex items-start gap-3">
              <div>
                {validator?.description?.identity ?
                  <img
                    src={logo(validator.description?.identity)}
                    alt="avatar"
                    className='w-28 h-28 tiny:w-24 tiny:h-24 rounded-lg'
                  /> :
                  <CircleUser className="w-28 h-28 tiny:w-24 tiny:h-24 text-lumera-label"/>
                }
              </div>
              <div>
                <div>{validator?.description?.moniker}</div>
                <div className='text-[12px] text-lumera-gray'>
                  {balances ? formatTokenDisplay(balances) : '0'} LUME
                </div>
                <div className='flex items-start tiny:items-center flex-col tiny:flex-row gap-1'>
                  <span className="flex items-center gap-1">
                    <AppLink
                      href={`/account/${supernode?.supernode_account}`}
                      className='text-lumera-teal hover:text-lumera-green text-[12px]'
                    >
                      <span className="hidden md:block">{supernode?.supernode_account}</span><span className="block md:hidden">{formatAddress(supernode?.supernode_account || '', 12, -6)}</span>
                    </AppLink>
                    <button
                      className="p-1 hover:text-white transition-colors cursor-pointer"
                      onClick={() => copyToClipboard(supernode?.supernode_account || '')}
                    >
                      <Copy className="w-3 h-3 text-lumera-label"/>
                    </button>
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  <AppLink
                    href={`/staking/${supernode?.validator_address}`}
                    className='text-lumera-teal hover:text-lumera-green text-[12px]'
                  >
                    <span className="hidden md:block">{supernode?.validator_address}</span><span className="block md:hidden">{formatAddress(supernode?.validator_address || '', 12, -6)}</span>
                  </AppLink>
                  <button
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(supernode?.validator_address || '')}
                  >
                    <Copy className="w-3 h-3 text-lumera-label"/>
                  </button>
                </div>
                <div>
                  {listSuperNodes && supernode ? getState(listSuperNodes[supernode?.supernode_account] as any) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center md:justify-end gap-2">
            <div className="text-right mr-4">
              <div className="text-xs text-lumera-gray flex items-center justify-end gap-1 whitespace-nowrap">
                <ChartLine className="w-4 h-4"/>
                <span>Network Activity</span>
              </div>
              <div className="text-lg font-semibold text-lumera-gray">
                {networkActivityPercent ? `${networkActivityPercent.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div className='w-full sm:w-auto'>
              <AppButton onClick={handleRefresh} className='!px-3 !py-1 md:px-4 md:py-2 text-sm md:text-base'>
                Refresh
              </AppButton>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start mt-3">
          <div className='text-base text-lumera-gray'>
            <div className="flex flex-wrap items-center gap-1 tiny:gap-3 text-sm">
              <div className='flex gap-1 items-center min-w-32'>
                <Network className='w-4 h-4' />
                <span>IP Address</span>
              </div>
              <div>
                <span className={`flex items-center gap-2 ${snOpen === false ? 'text-error' : 'text-base-content'}`}>
                  <span className="font-mono">{metrics?.ip_address || '—' }</span>
                  {metrics?.ip_address ?
                    <button
                      className="p-1 hover:text-white transition-colors cursor-pointer"
                      onClick={() => copyToClipboard(metrics?.ip_address || '-')}
                    >
                      <Copy className="w-4 h-4"/>
                    </button> : null
                  }
                </span>
                {hostOnly && p2pPortEffective ? (
                  <span className={`flex items-center gap-2 ${p2pOpen === false ? 'text-error' : 'text-base-content'}`}>
                    <span className="font-mono">{buildHostWithPort(hostOnly, p2pPortEffective as any)}</span>
                    <button
                      className="p-1 hover:text-white transition-colors cursor-pointer"
                      onClick={() => copyToClipboard(buildHostWithPort(hostOnly, p2pPortEffective as any))}
                    >
                      <Copy className="w-4 h-4"/>
                    </button>
                  </span>
                ) : null}

                {hostOnly ? (
                  <span className={`flex items-center gap-2 ${apiOpen === false ? 'text-error' : 'text-base-content'}`}>
                    <span className="font-mono">{buildHostWithPort(hostOnly, apiPort)}</span>
                    <button
                      className="p-1 hover:text-white transition-colors cursor-pointer"
                      onClick={() => copyToClipboard(buildHostWithPort(hostOnly, apiPort))}
                    >
                      <Copy className="w-4 h-4"/>
                    </button>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1.5">
              <div className='flex gap-1 items-center min-w-32'>
                {metrics?.is_status_api_available ?
                  <CircleCheck className='w-4 h-4 text-lumera-teal' /> :
                  <CircleX className='w-4 h-4 text-lumera-red' />
                }
                <span>Availability</span>
              </div>
              <div>
                <span className={metrics?.is_status_api_available ? 'text-lumera-teal' : 'text-lumera-red'}>
                  {metrics?.is_status_api_available ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1.5">
              <div className='flex gap-1 items-center min-w-32'>
                <Tag className='w-4 h-4' />
                <span>Version</span>
              </div>
              <div>
                {metrics?.actual_version || '—'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1.5">
              <div className='flex gap-1 items-center min-w-32'>
                <Network className='w-4 h-4' />
                <span>Protocol</span>
              </div>
              <div>
                {metrics?.protocol_version || '—'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1.5">
              <div className='flex gap-1 items-center min-w-32'>
                <Users className='w-4 h-4' />
                <span>Peers</span>
              </div>
              <div>
                {metrics?.peers_count ?? '—'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1.5">
              <div className='flex gap-1 items-center min-w-32'>
                <Clock4 className='w-4 h-4' />
                <span>Uptime</span>
              </div>
              <div>
                { formatUptime(metrics?.uptime_seconds) }
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1.5">
              <div className='flex gap-1 items-center min-w-32'>
                <WalletCards className='w-4 h-4' />
                <span>Payments</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 flex-col tiny:flex-row">
                <div className="flex items-center gap-1">
                  <span className="text-lumera-gray">Action:</span>
                  <span>
                    {actionLume() !== null ? formatLume(actionLume()) : actionRewardsText()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lumera-gray">Fees:</span>
                  <span>
                    {feesLume() !== null ? formatLume(feesLume()) : finalizeFeesText()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lumera-gray">Profit:</span>
                  <span className={profitLume() != null && Number(profitLume()) < 0 ? 'text-error' : 'text-base-content'}>
                    {formatLume(profitLume())}
                  </span>
                </div>
              </div>
            </div>

          </div>
          <div className='text-lumera-gray'>
            <div className='flex gap-1 items-center min-w-32'>
              <Server className='w-4 h-4' />
              <span>Payments</span>
            </div>
            {hardwareSummaryLine() ?
              <div className='text-sm font-medium mt-2 text-lumera-label'>{hardwareSummaryLine()}</div> : null
            }
            <div className='mt-2 text-sm'>
              <div className="mb-1 flex items-center justify-between">
                <span className={`flex items-center gap-1 ${hwCpuBelow ? 'text-error tooltip tooltip-error' : 'text-lumera-gray'}`}
                >
                  <Cpu className="w-4 h-4" />
                  CPU
                </span>
                <span className='text-lumera-label'>{metrics?.cpu_cores ?? '—' } cores • {formatCpuPercent(1)}</span>
              </div>
              <div className="w-full bg-lumera-icon-bg rounded h-2">
                <div className="h-2 rounded bg-lumera-teal" style={{ width: Math.min(cpuPercent(), 100) + '%' }}></div>
              </div>
            </div>
            <div className='mt-3 text-sm'>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex items-center gap-1 ${hwMemBelow ? 'text-lumera-red tooltip tooltip-error' : 'text-lumera-gray'}`}
                >
                  <MemoryStick className="w-4 h-4" />
                  Memory
                </span>
                <span className='text-lumera-label'>
                  {(metrics?.memory_used_gb ?? 0).toFixed(1)} /
                  {(metrics?.memory_total_gb ?? 0).toFixed(1)} GB
                  ({formatPercent(metrics?.memory_usage_percent, 1)})
                </span>
              </div>
              <div className="w-full bg-lumera-icon-bg rounded h-2">
                <div className="h-2 rounded bg-lumera-teal" style={{ width: Math.min(metrics?.memory_usage_percent||0, 100) + '%' }}></div>
              </div>
            </div>
            <div className='text-lumera-label text-sm mt-3'>
              <div className="mb-1 flex items-center justify-between text-lumera-gray">
                <span
                  className={`flex items-center gap-1 ${hwStorageBelow ? 'text-lumera-red tooltip tooltip-error' : 'text-lumera-gray'}`}
                >
                  <HardDrive className="w-4 h-4" />
                  Storage
                </span>
                <span className='text-lumera-label'>
                  {formatBytes(metrics?.storage_used_bytes || 0)} /
                  {formatBytes(metrics?.storage_total_bytes || 0)}({formatPercent(metrics?.storage_usage_percent, 0)})
                </span>
              </div>
              <div className="w-full bg-lumera-icon-bg rounded h-2 relative mt-1">
                <div className={`h-2 w-full rounded ${(metrics?.storage_usage_percent||0) <= 60 ? 'bg-lumera-teal' : ''} ${(metrics?.storage_usage_percent||0) > 60 && (metrics?.storage_usage_percent||0) <= 80 ? 'bg-lumera-warning' : ''} ${(metrics?.storage_usage_percent||0) > 80 ? 'bg-lumera-red' : ''}`}
                style={{width: Math.min(metrics?.storage_usage_percent||0, 100) + '%' }}></div>
                {getP2pBytes() ?
                  <Tooltip>
                    <Tooltip.Trigger>
                      <div
                        className='absolute -top-2 w-2 h-2 rounded-full bg-lumera-blue-light border border-white tooltip tooltip-info'
                        style={{ transform: 'translateX(-50%)', left: getP2pLeftPercent() + '%' }}
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
                        {getP2pLabel()}
                      </div>
                    </Tooltip.Content>
                  </Tooltip> : null
                }
              </div>
              {getP2pBytes() ?
                <div className="text-xs text-gray-400 mt-2 flex">
                  <div>
                    P2P DB: {formatBytes(getP2pBytes() || 0)}
                  </div>
                  {metrics?.p2p_records !== null ?
                    <div>
                      ({formatCount(metrics?.p2p_records)} records)
                    </div> : null
                  }
                </div> : null
              }
            </div>
          </div>
        </div>
        <div className="mt-4 border-t-[1px] border-lumera-label pt-3">
          <span className="text-lumera-label text-sm">This supernode provides Cascade service</span>
        </div>
        <div className="mt-2">
          <Card elevate size="$4" bordered className='w-full p-3 relative !shadow-none !border-none !px-0'>
            <button type="button" className="border-0 bg-transparent cursor-pointer" onClick={() => setShowMoreInfo(!showMoreInfo)}>
              <SectionTitle className='mb-0 flex justify-between items-center text-lumera-gray'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-base'>More info</span>
                </div>
                {showMoreInfo ?
                  <ChevronUp className='w-5 h-5' /> :
                  <ChevronDown className='w-5 h-5' />
                }
              </SectionTitle>
            </button>
            {showMoreInfo ?
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-3'>
                <Card elevate size="$4" bordered className='w-full estimated-rewards-card p-4 relative'>
                  <AppLoading
                    isLoading={isLoading}
                    className="w-10 h-10 !border-2"
                    iconWidth={20}
                    iconHeight={20}
                    containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                  />
                  <SectionTitle className='mb-0 !text-sm flex items-center gap-1.5'>
                    <History className='w-4 h-4' />
                    <span>State History</span>
                  </SectionTitle>
                  <div className='mt-3 h-[392px] overflow-auto'>
                    {supernode?.states?.length ?
                      <>
                        {supernode.states.map((state) => (
                          <div className="flex justify-between text-sm mb-1 text-lumera-gray" key={`${state.state}-${state.height}`}>
                            <span >{state.state.replace(/^SUPERNODE_STATE_/,'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}</span>
                            <span>#{state.height}</span>
                          </div>
                        ))}
                      </> : <div className="text-sm  text-lumera-gray">No state history</div>
                    }
                  </div>
                </Card>
                <div className="flex flex-col gap-3">
                  <Card elevate size="$4" bordered className='w-full estimated-rewards-card p-4 relative'>
                    <AppLoading
                      isLoading={isLoading}
                      className="w-10 h-10 !border-2"
                      iconWidth={20}
                      iconHeight={20}
                      containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                    />
                    <SectionTitle className='mb-0 !text-sm flex items-center gap-1.5'>
                      <Network className='w-4 h-4' />
                      <span>IP Changes</span>
                    </SectionTitle>
                    <div className='mt-3 h-[72px] overflow-auto'>
                      {supernode?.prev_ip_addresses?.length ?
                        <>
                          {supernode.prev_ip_addresses.map((ip) => (
                            <div className="flex justify-between text-sm text-lumera-gray flex-col tiny:flex-row mb-2 tiny:mb-0" key={`${ip.address}-${ip.height}`}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono">{ip.address}</span>
                                <button
                                  className="p-1 hover:text-white transition-colors cursor-pointer"
                                  onClick={() => copyToClipboard(ip.address || '')}
                                >
                                  <Copy className="w-4 h-4"/>
                                </button>
                              </span>
                              <span className="font-mono">#{ip.height}</span>
                            </div>
                          ))}
                        </> : <div className="text-sm text-lumera-gray">No IP history</div>
                      }
                    </div>
                  </Card>
                  <Card elevate size="$4" bordered className='w-full estimated-rewards-card p-4 relative'>
                    <AppLoading
                      isLoading={isLoading}
                      className="w-10 h-10 !border-2"
                      iconWidth={20}
                      iconHeight={20}
                      containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                    />
                    <SectionTitle className='mb-0 !text-sm flex items-center gap-1.5'>
                      <ChartColumnIncreasing className='w-4 h-4' />
                      <span>Metrics</span>
                    </SectionTitle>
                    <div className='mt-3 h-14 overflow-auto'>
                      {Object.keys(extraMetrics).length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {Object.entries(extraMetrics).map(([key, val]) => (
                            <div
                              key={String(key)}
                              className="flex justify-between text-sm text-lumera-gray"
                            >
                              <span className="text-lumera-gray">{key}</span>
                              <span className="font-mono break-all">
                                {typeof val === 'object' && val !== null
                                  ? JSON.stringify(val)
                                  : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-lumera-gray">No metrics</div>
                      )}
                    </div>
                  </Card>
                  <Card elevate size="$4" bordered className='w-full estimated-rewards-card p-4 relative'>
                    <AppLoading
                      isLoading={isLoading}
                      className="w-10 h-10 !border-2"
                      iconWidth={20}
                      iconHeight={20}
                      containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                    />
                    <SectionTitle className='mb-0 !text-sm flex items-center gap-1.5'>
                      <BadgeAlert className='w-4 h-4' />
                      <span>Evidence</span>
                    </SectionTitle>
                    <div className='mt-3'>
                      {supernode?.evidence?.length ?
                        <div className="space-y-2 text-sm text-lumera-gray">
                          <pre className="bg-lumera-icon-bg p-2 rounded overflow-auto h-28"><code>{JSON.stringify(supernode?.evidence, null, 2)}</code></pre>
                        </div> : <div className="text-sm text-lumera-gray h-28">No evidence</div>
                      }
                    </div>
                  </Card>
                </div>
              </div> : null
            }
          </Card>
        </div>
      </Card>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isCascadeActionLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <SectionTitle className='mb-0'>
            Cascade Actions
          </SectionTitle>
          <div className='mt-3'>
            <div>Total: {formatNumber(cascadeAction?.total || 0, { decimalsLength: 0 })}</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-lumera-gray text-sm mt-2">
              <li className='flex justify-between'>
                <div>Done</div>
                <div>{formatNumber(cascadeAction?.states?.ACTION_STATE_DONE || 0, { decimalsLength: 0 })}</div>
              </li>
              <li className='flex justify-between'>
                <div>Approved</div>
                <div>{formatNumber(cascadeAction?.states?.ACTION_STATE_APPROVED || 0, { decimalsLength: 0 })}</div>
              </li>
              <li className='flex justify-between'>
                <div>Pending</div>
                <div>{formatNumber(cascadeAction?.states?.ACTION_STATE_PENDING || 0, { decimalsLength: 0 })}</div>
              </li>
              <li className='flex justify-between'>
                <div>Expired</div>
                <div>{formatNumber(cascadeAction?.states?.ACTION_STATE_EXPIRED || 0, { decimalsLength: 0 })}</div>
              </li>
            </ul>
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <AppLoading
            isLoading={isSenseActionLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <SectionTitle className='mb-0'>
            Sense Actions
          </SectionTitle>
          <div className='mt-3'>
            <div>Total: {formatNumber(senseAction?.total || 0, { decimalsLength: 0 })}</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-lumera-gray text-sm mt-2">
              <li className='flex justify-between mb-1'>
                <div>Done</div>
                <div>{formatNumber(senseAction?.states?.ACTION_STATE_DONE || 0, { decimalsLength: 0 })}</div>
              </li>
              <li className='flex justify-between mb-1'>
                <div>Approved</div>
                <div>{formatNumber(senseAction?.states?.ACTION_STATE_APPROVED || 0, { decimalsLength: 0 })}</div>
              </li>
              <li className='flex justify-between mb-1'>
                <div>Pending</div>
                <div>{formatNumber(senseAction?.states?.ACTION_STATE_PENDING || 0, { decimalsLength: 0 })}</div>
              </li>
              <li className='flex justify-between mb-1'>
                <div>Expired</div>
                <div>{formatNumber(senseAction?.states?.ACTION_STATE_EXPIRED || 0, { decimalsLength: 0 })}</div>
              </li>
            </ul>
          </div>
        </Card>
      </div>
      <div className="mt-6">
        <Card elevate size="$4" bordered className='w-full p-5 relative'>
          <SectionTitle className='mb-0'>
            Recent Activity
          </SectionTitle>
          <AppLoading
            isLoading={isRecentActivityLoading}
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
          <div className='overflow-auto mt-6 max-h-[550px]'>
            <table className='w-full table'>
              <thead className='hidden md:table-header-group text-sm'>
                <tr className='text-sm'>
                  <th align='left' className='text-lumera-label'>Time</th>
                  <th align='left' className='text-lumera-label whitespace-nowrap'>Event</th>
                  <th align='left' className='text-lumera-label'>Amount</th>
                  <th align='left' className='text-lumera-label whitespace-nowrap'>Tx Hash</th>
                  <th align='left' className='text-lumera-label'>Height</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities?.map((item, index) => {
                  const last = item.transactions[item.transactions.length - 1];
                  return (
                    <tr
                      key={item.register_tx_id}
                      className={`${index % 2 === 0 ? '!bg-gray-900' : ''} hover:!bg-gray-800/60 transition-colors flex flex-col md:table-row text-sm`}
                    >
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Time:</div>
                        <div className='flex items-center gap-2'>
                          {dayjs(item.finalize_tx_time).format('MM/DD/YYYY HH:mm:ss A')}
                        </div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Event:</div>
                        <div className='capitalize'>
                          {last.tx_type}
                        </div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-1'>Amount:</div>
                        <div>
                          <Tooltip>
                            <Tooltip.Trigger>
                              <span>
                                {formatTokenDisplay({
                                  amount: last.action_price,
                                  denom: last.action_price_denom,
                                })} LUME
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
                                {formatNumber(last.action_price, { decimalsLength: 0 })} {last.action_price_denom}
                              </div>
                            </Tooltip.Content>
                          </Tooltip>
                        </div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-2'>Tx Hash:</div>
                        <div>
                          <AppLink
                            href={`/tx/${item.finalize_tx_id}`}
                            className='text-lumera-teal hover:text-lumera-green'
                          >
                            {item?.finalize_tx_id ? formatAddress(item?.finalize_tx_id, 12, -6) : ''}
                          </AppLink>
                        </div>
                      </td>
                      <td className='cursor-pointer text-left'>
                        <div className='block md:hidden text-lumera-label mb-2'>Height:</div>
                        <div>
                          <AppLink
                            href={`/blocks/${last.height}`}
                            className='text-lumera-teal hover:text-lumera-green'
                          >
                            {last.height}
                          </AppLink>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!recentActivities?.length && !isRecentActivityLoading && !recentActivitiesError ?
                  <tr
                    className={`flex flex-col md:table-row text-sm`}
                  >
                    <td className='cursor-pointer text-left' colSpan={10}>
                      <div className="text-lg font-bold py-0 text-center">No data</div>
                    </td>
                  </tr> : null
                }
                {recentActivitiesError && !isRecentActivityLoading ?
                  <tr
                    className={`flex flex-col md:table-row text-sm`}
                  >
                    <td className='cursor-pointer text-left' colSpan={10}>
                      <div className="py-0 text-center text-lumera-red">{recentActivitiesError}</div>
                    </td>
                  </tr> : null
                }
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
