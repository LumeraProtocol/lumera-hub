"use client"

/*
 * The hub shell.
 *
 * Changes from the previous shell that are worth naming:
 *
 * - Connect Wallet is no longer indigo. Every actionable surface in the hub is
 *   now the same teal → green family, so the eye can learn one colour.
 * - Nav no longer promises what it cannot deliver. Sense, Inference and NFTs
 *   were four stub destinations out of eight; they now sit behind a single
 *   "Coming soon" grouping rather than occupying primary slots.
 * - The sidebar carries live network state — chain, height, status — so the
 *   reader always knows which chain they are looking at. The testnet banner
 *   makes that unmissable when it matters.
 * - Disconnected is a viewing state. The header offers "Watch an address"
 *   beside Connect, and the rest of the app renders public data regardless.
 */

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';

import { WalletModalComponent } from '@/components/ConnectWallet'
import { ConnectDrawer } from '@/components/hub/ConnectDrawer'
import AppLink from '@/components/AppLink';
import {
  PORTAL_URL,
  CHAIN_ID,
  IS_TESTNET,
  IS_MAINNET,
  NETWORK_LABEL,
  FAUCET_URL,
  SIBLING_HUB_URL,
} from '@/contants/network';
import useWalletConnect from '@/hooks/useWalletConnect';
import useChainHead from '@/hooks/useChainHead';
import useHubNotifications from '@/hooks/useHubNotifications';
import useLiveProposalCount from '@/hooks/useLiveProposalCount';
import { showGlobalApiErrorToast } from '@/utils/global-api-error';

import { useSelector, useDispatch } from '@/redux/hooks';
import { setActiveView, setCurrentPath } from '@/redux/app.slice';
import { setError } from '@/redux/error.slice';

import { ViewId } from '@/types';

import { useHub, short } from '@lumera-hub/ui/src/hub/session';
import { GlobalSearch, type SearchHit } from '@lumera-hub/ui/src/hub/GlobalSearch';
import { Badge, Button, cx, DotLabel } from '@lumera-hub/ui/src/design/primitives';
import {
  AlertIcon,
  BellIcon,
  CascadeIcon,
  CloseIcon,
  DashboardIcon,
  ExternalIcon,
  EyeIcon,
  FaucetIcon,
  FoundryIcon,
  GovernanceIcon,
  MenuIcon,
  SearchIcon,
  StakingIcon,
  WalletIcon,
} from '@lumera-hub/ui/src/design/icons';

type NavItem = {
  id: ViewId;
  label: string;
  url: string;
  icon: React.ReactNode;
  newPage?: boolean;
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", url: "/", icon: <DashboardIcon /> },
  { id: "wallet", label: "Wallet", url: "/wallet", icon: <WalletIcon /> },
  { id: "staking", label: "Staking", url: "/staking", icon: <StakingIcon /> },
  { id: "governance", label: "Governance", url: "/governance", icon: <GovernanceIcon /> },
  { id: "cascade", label: "Cascade", url: "/cascade", icon: <CascadeIcon /> },
  { id: "foundry", label: "Foundry", url: "/foundry", icon: <FoundryIcon /> },
]

/*
 * Kept for the pages that still link to these routes. They are no longer
 * primary navigation because every one of them renders a "Coming soon" card,
 * and a nav slot is a promise.
 */
const PREVIEW_NAV: NavItem[] = [
  { id: "blocks", label: "Blocks", url: "/blocks", icon: <DashboardIcon /> },
  { id: "sense", label: "Sense", url: "/sense", icon: <SearchIcon /> },
  { id: "inference", label: "Inference", url: "/inference", icon: <FoundryIcon /> },
  { id: "nfts", label: "NFTs", url: "/nfts", icon: <CascadeIcon /> },
]

// Exported because several screens still read it to build cross-links.
export const NAV_ITEMS: NavItem[] = [
  ...PRIMARY_NAV,
  ...PREVIEW_NAV,
  { id: "portal", label: "Portal", url: PORTAL_URL, icon: <ExternalIcon />, newPage: true },
]

function isActive(currentUrl: string, url: string) {
  if (url === '/') return currentUrl === '/'
  return currentUrl.startsWith(url)
}

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate: () => void
}) {
  return (
    <AppLink
      href={item.url}
      target={item.newPage ? '_blank' : ''}
      className="block"
    >
      <span
        onClick={onNavigate}
        className={cx(
          'flex w-full cursor-pointer items-center gap-[11px] rounded-control px-[11px] py-[9px] text-base font-medium transition-colors',
          active
            ? 'bg-lumera-teal/18 text-text-primary'
            : 'text-text-muted hover:bg-ink-600 hover:text-text-primary',
        )}
      >
        <span className="flex-none">{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.badge ? <Badge tone="neutral">{item.badge}</Badge> : null}
        {item.newPage ? <ExternalIcon size={12} className="flex-none opacity-75" /> : null}
      </span>
    </AppLink>
  )
}

function NetworkPanel({ height, reachable }: { height: number; reachable: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-[9px] border border-line-hairline bg-ink-800 px-3 py-[11px]">
      {SIBLING_HUB_URL ? (
        <div className="mb-0.5 flex gap-[3px] rounded-inner border border-line-hairline bg-ink-900 p-[3px]">
          <NetworkTab label="MAINNET" active={IS_MAINNET} href={IS_MAINNET ? undefined : SIBLING_HUB_URL} />
          <NetworkTab label="TESTNET" active={IS_TESTNET} href={IS_TESTNET ? undefined : SIBLING_HUB_URL} warn />
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-small text-text-tertiary">Status</span>
        <DotLabel tone={reachable ? 'cyan' : 'danger'} pulse={reachable}>
          {reachable ? 'Online' : 'Unreachable'}
        </DotLabel>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-small text-text-tertiary">Block</span>
        <span className="font-mono text-small font-medium tnum text-text-secondary">
          {height ? `#${height.toLocaleString('en-US')}` : '—'}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex-none text-small text-text-tertiary">Chain</span>
        <span className="truncate font-mono text-small font-medium text-text-secondary">
          {CHAIN_ID}
        </span>
      </div>
      {/* The switch above already names the network, so this row only earns
          its place when there is no switch to read it from. */}
      {SIBLING_HUB_URL ? null : (
        <div className="flex items-baseline justify-between">
          <span className="text-small text-text-tertiary">Network</span>
          <Badge tone={IS_TESTNET ? 'warn' : 'neutral'}>{NETWORK_LABEL.toUpperCase()}</Badge>
        </div>
      )}
    </div>
  )
}

/**
 * One half of the network switch. The active side is inert; the other links to
 * the sibling deployment, because the two hubs are separate builds.
 */
function NetworkTab({
  label,
  active,
  href,
  warn,
}: {
  label: string
  active: boolean
  href?: string
  warn?: boolean
}) {
  const className = cx(
    'flex-1 rounded-[5px] py-[7px] text-center font-mono text-micro font-medium tracking-[0.08em] whitespace-nowrap no-underline transition-colors',
    active
      ? warn
        ? 'bg-warn/16 text-warn'
        : 'bg-ink-600 text-text-secondary'
      : 'bg-transparent text-text-muted hover:text-text-secondary',
  )
  if (active || !href) {
    return <span className={className}>{label}</span>
  }
  return (
    <a href={href} className={className}>
      {label}
    </a>
  )
}

function SidebarContent({
  currentPath,
  onNavigate,
  height,
  reachable,
  liveProposals,
}: {
  currentPath: string
  onNavigate: () => void
  height: number
  reachable: boolean
  liveProposals: number
}) {
  return (
    <>
      <AppLink href="/">
        <div className="flex h-16 flex-none items-center gap-[9px] border-b border-line-hairline px-5">
          <Image
            className="h-[19px] w-auto"
            src="/logo.svg"
            alt="Lumera"
            width={104}
            height={25}
            priority
          />
          <span className="mt-0.5 rounded-[4px] border border-line-edge px-[5px] py-[3px] font-mono text-micro font-semibold tracking-[0.14em] text-text-tertiary">
            HUB
          </span>
        </div>
      </AppLink>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {PRIMARY_NAV.map((item) => (
          <NavButton
            key={item.id}
            item={
              // The badge is the number of proposals actually open for voting,
              // so the nav says whether governance needs the reader now.
              item.id === 'governance' && liveProposals > 0
                ? { ...item, badge: String(liveProposals) }
                : item
            }
            active={isActive(currentPath, item.url)}
            onNavigate={onNavigate}
          />
        ))}

        <div className="mt-auto" />
        <div className="my-2 h-px flex-none bg-line-hairline" />

        {FAUCET_URL ? (
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-[11px] rounded-control px-[11px] py-[9px] text-base font-medium text-text-muted no-underline transition-colors hover:bg-ink-600 hover:text-text-primary"
          >
            <FaucetIcon />
            <span className="flex-1">Faucet</span>
            <Badge tone="warn">TEST</Badge>
          </a>
        ) : null}

        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center gap-[11px] rounded-control px-[11px] py-[9px] text-base font-medium text-text-muted no-underline transition-colors hover:bg-ink-600 hover:text-text-primary"
        >
          <SearchIcon />
          <span className="flex-1">Explorer</span>
          <ExternalIcon size={12} className="flex-none opacity-75" />
        </a>
      </nav>

      <div className="flex-none border-t border-line-hairline p-3">
        <NetworkPanel height={height} reachable={reachable} />
      </div>
    </>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { address } = useWalletConnect();
  const { currentPath } = useSelector((state) => state.app);
  const { message } = useSelector((state) => state.error);
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const hub = useHub();
  const { height, reachable } = useChainHead();
  const notifications = useHubNotifications(hub.address || undefined);
  const liveProposals = useLiveProposalCount();

  useEffect(() => {
    dispatch(setError({ message: null, status: null }))
    const referrer = sessionStorage.getItem('acquisitionSource');
    if (!referrer) {
      sessionStorage.setItem('acquisitionSource', searchParams.get('utm_source') || document.referrer || 'Direct');
    }
  }, [dispatch, searchParams]);

  useEffect(() => {
    showGlobalApiErrorToast(message, toast);
  }, [message]);

  useEffect(() => {
    if (!pathname) return
    dispatch(setCurrentPath({ currentPath: pathname }));
    const navItem = NAV_ITEMS.find((item) => isActive(pathname, item.url));
    dispatch(setActiveView({ activeView: navItem?.id || "dashboard" }));
  }, [dispatch, pathname]);

  // Close the mobile drawer whenever the route changes under it.
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const activePath = pathname || currentPath || '/'

  /*
   * Search corpus. Only the shell-level destinations live here; screens that
   * hold a richer corpus (validators, proposals, files) contribute through
   * their own pages once loaded.
   */
  const buildHits = useMemo(
    () =>
      (query: string): SearchHit[] => {
        const q = query.toLowerCase()
        const hits: SearchHit[] = []
        if (/^[0-9A-Fa-f]{40,64}$/.test(query.trim())) {
          hits.push({
            key: 'tx',
            tag: 'TX',
            tagClass: 'text-lumera-green',
            title: short(query.trim(), 10, 6),
            sub: 'Open transaction',
            onPick: () => router.push(`/tx/${query.trim()}`),
          })
        }
        NAV_ITEMS.filter((n) => !n.newPage && n.label.toLowerCase().includes(q)).forEach((n) => {
          hits.push({
            key: 'proposal',
            tag: 'PAGE',
            tagClass: 'text-text-tertiary',
            title: n.label,
            sub: n.url,
            onPick: () => router.push(n.url),
          })
        })
        return hits
      },
    [router],
  )

  return (
    <div className="flex min-h-screen bg-ink-800 text-text-primary">
      {/* Sidebar — permanent from lg up */}
      <aside className="fixed inset-y-0 z-50 hidden w-[236px] flex-col border-r border-line-hairline bg-ink-900 lg:flex">
        <SidebarContent
          currentPath={activePath}
          onNavigate={() => undefined}
          height={height}
          reachable={reachable}
          liveProposals={liveProposals}
        />
      </aside>

      {/* Sidebar — drawer below lg */}
      {isSidebarOpen ? (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            className="animate-fade fixed inset-0 z-40 bg-[rgba(0,8,20,.7)] lg:hidden"
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-[276px] max-w-[85vw] flex-col border-r border-line-hairline bg-ink-900 lg:hidden"
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-inner border border-line-edge bg-transparent text-text-muted"
            >
              <CloseIcon size={14} />
            </button>
            <SidebarContent
              currentPath={activePath}
              onNavigate={() => setSidebarOpen(false)}
              height={height}
              reachable={reachable}
              liveProposals={liveProposals}
            />
          </aside>
        </>
      ) : null}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[236px]">
        <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-line-hairline bg-ink-800 px-4 sm:gap-4 sm:px-[26px]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-control border border-line-hairline bg-transparent text-text-muted lg:hidden"
          >
            <MenuIcon size={18} />
          </button>

          <GlobalSearch
            buildHits={buildHits}
            onWatchAddress={(addr) => {
              hub.watch(addr)
              router.push('/wallet')
            }}
            onOpenBlock={(h) => router.push(`/blocks/${h}`)}
            onSeeAll={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
          />

          <div className="flex-1" />

          <div className="relative flex-none">
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-control border border-line-hairline bg-transparent text-text-muted transition-colors hover:border-line-edge hover:text-text-secondary"
            >
              <BellIcon />
            </button>
            {notifications.length ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-ink-800 bg-lumera-green px-1 font-mono text-[10px] leading-none font-semibold text-ink-800"
              >
                {notifications.length}
              </span>
            ) : null}
            {notifOpen ? (
              <>
                <div
                  className="fixed inset-0 z-60"
                  onClick={() => setNotifOpen(false)}
                  aria-hidden="true"
                />
                <div className="animate-fade absolute top-11 right-0 z-70 w-[min(396px,calc(100vw-2rem))] overflow-hidden rounded-card border border-line-edge bg-ink-700 shadow-[0_20px_50px_rgba(0,8,20,.65)]">
                  <div className="flex items-center justify-between border-b border-line-hairline px-4 py-[13px]">
                    <h3 className="m-0 text-base font-semibold text-text-primary">Notifications</h3>
                  </div>
                  {notifications.length ? (
                    <div className="max-h-[392px] overflow-y-auto">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false)
                            router.push(n.href)
                          }}
                          className="flex w-full cursor-pointer gap-[11px] border-b border-line-hairline px-4 py-[13px] text-left transition-colors last:border-b-0 hover:bg-ink-600"
                        >
                          <span
                            className={cx(
                              'mt-[5px] h-1.5 w-1.5 flex-none rounded-full',
                              n.tone === 'green'
                                ? 'bg-lumera-green'
                                : n.tone === 'warn'
                                  ? 'bg-warn'
                                  : n.tone === 'danger'
                                    ? 'bg-danger'
                                    : 'bg-text-muted',
                            )}
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <span className="flex items-baseline gap-2">
                              <span
                                className={cx(
                                  'font-mono text-micro font-medium tracking-[0.08em]',
                                  n.tone === 'green'
                                    ? 'text-lumera-green'
                                    : n.tone === 'warn'
                                      ? 'text-warn'
                                      : 'text-text-tertiary',
                                )}
                              >
                                {n.kind.toUpperCase()}
                              </span>
                              <span className="ml-auto text-small text-text-muted">{n.when}</span>
                            </span>
                            <span className="text-base leading-[1.35] font-medium text-text-primary text-pretty">
                              {n.title}
                            </span>
                            <span className="text-small leading-[1.5] text-text-tertiary text-pretty">
                              {n.body}
                            </span>
                            <span className="text-small font-medium text-lumera-green">
                              {n.cta} →
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-base text-text-muted">
                      {hub.hasPosition
                        ? 'Nothing needs your attention.'
                        : 'Connect or watch an address for alerts about its position.'}
                    </div>
                  )}
                  <div className="border-t border-line-hairline bg-ink-800 px-4 py-2.5 text-center text-small text-text-muted">
                    {hub.isWatching
                      ? 'Derived from the watched address'
                      : hub.isConnected
                        ? 'Derived from your position on chain'
                        : 'Rewards, votes and unbonding land here'}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {hub.isConnected ? (
            <div className="hidden items-center gap-0.5 rounded-[9px] border border-line-hairline bg-ink-800 py-1 pr-1 pl-3 sm:flex">
              <span className="pr-3 font-mono text-small font-medium text-text-primary">
                {short(address || '')}
              </span>
              <button
                type="button"
                onClick={hub.disconnect}
                className="flex-none cursor-pointer rounded-chip border border-line-edge bg-ink-600 px-[9px] py-[7px] text-small font-medium text-text-muted transition-colors hover:border-danger-edge hover:text-danger"
              >
                Disconnect
              </button>
            </div>
          ) : hub.isWatching ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2 rounded-[9px] border border-dashed border-line-edge bg-ink-800 px-3 py-2 sm:flex">
                <EyeIcon size={14} className="text-text-muted" />
                <span className="font-mono text-small font-medium text-text-secondary">
                  {short(hub.address)}
                </span>
                <button
                  type="button"
                  onClick={hub.disconnect}
                  aria-label="Stop watching"
                  className="cursor-pointer border-none bg-transparent p-0 text-text-muted hover:text-text-primary"
                >
                  <CloseIcon size={12} />
                </button>
              </div>
              <Button variant="solid" onClick={hub.connect}>
                Connect wallet
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-[9px]">
              <Button
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() => hub.openDrawer({ kind: 'connect' })}
              >
                <EyeIcon size={14} />
                Watch an address
              </Button>
              <Button variant="solid" onClick={hub.connect}>
                Connect wallet
              </Button>
            </div>
          )}
        </header>

        {IS_TESTNET ? (
          <div className="flex flex-none items-center gap-2.5 border-b border-warn-edge bg-warn/9 px-4 py-[9px] sm:px-[26px]">
            <AlertIcon size={14} className="flex-none text-warn" />
            <span className="text-small leading-[1.4] font-medium text-warn">
              Testnet — {CHAIN_ID}. Tokens have no value and the chain resets periodically.
            </span>
          </div>
        ) : null}

        <main className="flex-1 px-4 pt-[26px] pb-10 sm:px-[26px]">
          <div className="mx-auto flex min-w-0 max-w-[1180px] flex-col gap-[18px]">{children}</div>
        </main>
      </div>

      {/* One connect drawer for the whole app: every gated action opens this
          same one, carrying the intent that triggered it. */}
      <ConnectDrawer />
      <WalletModalComponent />
    </div>
  )
}
