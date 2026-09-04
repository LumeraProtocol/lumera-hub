'use client'

/*
 * Hub session: who is looking, what they are trying to do, and what is on
 * screen because of it.
 *
 * Three things live here that the old app did not have.
 *
 * 1. Watch mode. The hub reads public chain data without a wallet, so
 *    `disconnected` is a viewing state, not a wall. `watching` pins a specific
 *    address so balances and delegations resolve read-only.
 *
 * 2. Intent gating. A gated action is not hidden or disabled — it runs through
 *    `gate()`, which remembers what the reader was doing, asks for a wallet,
 *    and then completes the original action. Nothing typed is lost.
 *
 * 3. One drawer. Every modal in the old app (ten near-identical transaction
 *    dialogs) is a variant of a single right-hand drawer, so the review → sign
 *    → receipt sequence is written once.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export type WalletMode = 'disconnected' | 'watching' | 'connected'

/** What the reader was trying to do when a wallet turned out to be needed. */
export type Intent = {
  title: string
  line: string
  lineLabel?: string
  extra?: { k: string; v: string; tone?: 'primary' | 'green' | 'warn' | 'danger' }
}

export type Drawer =
  | { kind: 'connect' }
  | { kind: 'tx'; intent: Intent }
  | { kind: 'send' }
  | { kind: 'receive' }
  | { kind: 'validator'; name: string }
  | { kind: 'file'; cid: string }
  | { kind: 'txdetail'; hash: string }
  | { kind: 'vote'; proposalId: string }
  | { kind: 'propose' }
  | { kind: 'watched'; address: string }

export type Toast = { id: number; message: string; tone: 'ok' | 'warn' | 'error' }

export type WatchedAddress = {
  address: string
  label?: string
}

type HubValue = {
  /** Address in use, whether connected or merely watched. */
  address: string
  mode: WalletMode
  isConnected: boolean
  isWatching: boolean
  isDisconnected: boolean
  /** True when there is an address to read a position from, signing or not. */
  hasPosition: boolean
  /** True when an action needs a wallet the reader does not have. */
  gated: boolean

  connect: () => void
  disconnect: () => void
  watch: (address: string) => void
  watched: WatchedAddress[]
  addWatched: (address: string, label?: string) => void
  removeWatched: (address: string) => void

  /**
   * Run `action` if a wallet can sign, otherwise ask for one first and run it
   * on success. `intent` is what the connect drawer explains.
   */
  gate: (intent: Intent, action: () => void) => void

  drawer: Drawer | null
  openDrawer: (d: Drawer) => void
  closeDrawer: () => void
  /** The intent shown at the top of the connect drawer, if any. */
  pendingIntent: Intent | null

  toasts: Toast[]
  flash: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const HubContext = createContext<HubValue | null>(null)

export const LUMERA_ADDRESS = /^lumera1[a-z0-9]{32,45}$/

const WATCH_STORAGE_KEY = 'lumera-hub:watched'

function readStoredWatched(): WatchedAddress[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(WATCH_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is WatchedAddress =>
        !!x && typeof x.address === 'string' && LUMERA_ADDRESS.test(x.address),
    )
  } catch {
    return []
  }
}

export function HubProvider({
  children,
  /** The signing address from the real wallet, when one is connected. */
  connectedAddress,
  /** Opens the app's existing wallet-selection modal. */
  onRequestConnect,
  /** Disconnects the real wallet. */
  onDisconnect,
}: {
  children: React.ReactNode
  connectedAddress?: string
  onRequestConnect?: () => void
  onDisconnect?: () => void
}) {
  const [watchedAddress, setWatchedAddress] = useState<string>('')
  const [watched, setWatched] = useState<WatchedAddress[]>([])
  const [drawer, setDrawer] = useState<Drawer | null>(null)
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const pendingAction = useRef<(() => void) | null>(null)
  const toastSeq = useRef(0)

  useEffect(() => {
    setWatched(readStoredWatched())
  }, [])

  const persistWatched = useCallback((next: WatchedAddress[]) => {
    setWatched(next)
    try {
      window.localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage can be unavailable in private windows; watching still works
         for the session. */
    }
  }, [])

  const mode: WalletMode = connectedAddress
    ? 'connected'
    : watchedAddress
      ? 'watching'
      : 'disconnected'

  const isConnected = mode === 'connected'
  const isWatching = mode === 'watching'

  const flash = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = ++toastSeq.current
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawer(null)
    setPendingIntent(null)
    pendingAction.current = null
  }, [])

  const openDrawer = useCallback((d: Drawer) => {
    setDrawer(d)
    if (d.kind !== 'connect') setPendingIntent(null)
  }, [])

  const gate = useCallback(
    (intent: Intent, action: () => void) => {
      if (isConnected) {
        action()
        return
      }
      pendingAction.current = action
      setPendingIntent(intent)
      setDrawer({ kind: 'connect' })
    },
    [isConnected],
  )

  // When a wallet arrives, resume whatever the reader was doing. The drawer
  // closes first so the resumed action can open its own.
  const wasConnected = useRef(isConnected)
  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      const resume = pendingAction.current
      pendingAction.current = null
      setPendingIntent(null)
      setDrawer(null)
      if (resume) {
        window.setTimeout(resume, 120)
      } else {
        flash('Wallet connected')
      }
    }
    wasConnected.current = isConnected
  }, [isConnected, flash])

  const connect = useCallback(() => {
    if (onRequestConnect) {
      onRequestConnect()
      return
    }
    setDrawer({ kind: 'connect' })
  }, [onRequestConnect])

  const disconnect = useCallback(() => {
    if (watchedAddress) {
      setWatchedAddress('')
      return
    }
    onDisconnect?.()
  }, [onDisconnect, watchedAddress])

  const watch = useCallback(
    (address: string) => {
      const trimmed = address.trim()
      if (!LUMERA_ADDRESS.test(trimmed)) return
      setWatchedAddress(trimmed)
      setDrawer(null)
      flash(`Watching ${short(trimmed)}`)
    },
    [flash],
  )

  const addWatched = useCallback(
    (address: string, label?: string) => {
      const trimmed = address.trim()
      if (!LUMERA_ADDRESS.test(trimmed)) return
      if (watched.some((w) => w.address === trimmed)) return
      persistWatched([...watched, { address: trimmed, label }])
      flash(`Watching ${short(trimmed)}`)
    },
    [flash, persistWatched, watched],
  )

  const removeWatched = useCallback(
    (address: string) => {
      persistWatched(watched.filter((w) => w.address !== address))
      flash('Removed from watched addresses')
    },
    [flash, persistWatched, watched],
  )

  const value = useMemo<HubValue>(
    () => ({
      address: connectedAddress || watchedAddress,
      mode,
      isConnected,
      isWatching,
      isDisconnected: mode === 'disconnected',
      hasPosition: isConnected || isWatching,
      gated: !isConnected,
      connect,
      disconnect,
      watch,
      watched,
      addWatched,
      removeWatched,
      gate,
      drawer,
      openDrawer,
      closeDrawer,
      pendingIntent,
      toasts,
      flash,
      dismissToast,
    }),
    [
      addWatched,
      closeDrawer,
      connect,
      connectedAddress,
      disconnect,
      dismissToast,
      drawer,
      flash,
      gate,
      isConnected,
      isWatching,
      mode,
      openDrawer,
      pendingIntent,
      removeWatched,
      toasts,
      watch,
      watched,
      watchedAddress,
    ],
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used inside <HubProvider>')
  return ctx
}

/** `lumera1q8f…9b2e` — long enough to recognise, short enough to sit in a row. */
export function short(address: string, lead = 9, tail = 4) {
  if (!address) return ''
  if (address.length <= lead + tail + 1) return address
  return `${address.slice(0, lead)}…${address.slice(-tail)}`
}

/** Copy with a toast, falling back for browsers without the async clipboard. */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the textarea path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
