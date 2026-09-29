// apps/web/src/app/loyalty/wallet/connect/page.tsx
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Helmet } from 'react-helmet-async'

import * as instance from '@/utils/api'
import useWalletConnect from '@/hooks/useWalletConnect'
import { SnagLinkScreen, type SnagLinkState } from '@lumera-hub/ui/src/screens/hub/SnagLinkScreen'

const SNAG_ADDRESS = /^0x[0-9a-fA-F]{40}$/

type LinkStatus = { configured?: boolean; siteUrl?: string; lumeraAddress?: string | null; error?: string }
type LinkResult = { linked?: boolean; lumeraAddress?: string; completed?: boolean }

/**
 * Where SNAG's "Connect wallet to Lumera Hub" quest lands (SNAG appends
 * ?walletAddress=<the reader's Snag profile>). The reader connects their Lumera
 * wallet and presses Link; /api/snag/save-user records the pair and completes
 * the quest on SNAG.
 */
function LinkWallet() {
  const router = useRouter()
  const params = useSearchParams()
  const { isConnected, bech32Address, openConnectView } = useWalletConnect()

  const raw = params.get('walletAddress')?.trim() || ''
  const snagAddress = SNAG_ADDRESS.test(raw) ? raw : null
  const walletAddress = isConnected && /^lumera1/.test(bech32Address) ? bech32Address : null

  const [state, setState] = useState<SnagLinkState>(snagAddress ? 'loading' : 'no-profile')
  const [siteUrl, setSiteUrl] = useState<string>()
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null)
  const [completed, setCompleted] = useState<boolean>()
  const [error, setError] = useState<string | null>(null)

  // Is this Snag profile already linked? Read once, before anything is posted.
  useEffect(() => {
    if (!snagAddress) {
      setState('no-profile')
      return
    }
    let live = true
    setState('loading')
    instance
      .getExternalQuiet(`/api/snag/save-user?snagAddress=${encodeURIComponent(snagAddress)}`)
      .then(({ data }: { data: LinkStatus }) => {
        if (!live) return
        setSiteUrl(data?.siteUrl || undefined)
        setLinkedAddress(data?.lumeraAddress || null)
        setState('ready')
      })
      .catch((err: { snagDisabled?: boolean; statusCode?: number }) => {
        if (!live) return
        if (err?.snagDisabled || err?.statusCode === 503) setState('unavailable')
        else {
          // The lookup is only a courtesy; linking itself can still go ahead.
          setState('ready')
        }
      })
    return () => {
      live = false
    }
  }, [snagAddress])

  const link = useCallback(() => {
    if (!snagAddress || !walletAddress) return
    setError(null)
    setState('linking')
    instance
      .postExternalQuiet('/api/snag/save-user', { snagAddress, lumeraAddress: walletAddress })
      .then(({ data }: { data: LinkResult }) => {
        setLinkedAddress(data?.lumeraAddress || walletAddress)
        setCompleted(data?.completed)
        setState(data?.lumeraAddress && data.lumeraAddress !== walletAddress ? 'ready' : 'linked')
      })
      .catch((err: { message?: string; snagDisabled?: boolean }) => {
        if (err?.snagDisabled) {
          setState('unavailable')
          return
        }
        setError(err?.message ? `Could not link: ${err.message}` : 'Could not link just now. Try again in a moment.')
        setState('ready')
      })
  }, [snagAddress, walletAddress])

  return (
    <SnagLinkScreen
      state={state}
      snagAddress={snagAddress}
      walletAddress={walletAddress}
      linkedAddress={linkedAddress}
      completed={completed}
      error={error}
      siteUrl={siteUrl}
      onConnect={() => openConnectView()}
      onLink={link}
      onOpenSprint={() => router.push('/snag')}
    />
  )
}

export default function Page() {
  useEffect(() => {
    document.title = 'Link wallet to Snag - Lumera Hub'
  }, [])

  return (
    <>
      <Helmet>
        <title>Link wallet to Snag - Lumera Hub</title>
      </Helmet>
      {/* useSearchParams needs a boundary, or the route opts out of static rendering. */}
      <Suspense fallback={null}>
        <LinkWallet />
      </Suspense>
    </>
  )
}
