'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Wallet-signed Cascade for the Chat lab: save and open a conversation through
 * the connected wallet and the SDK, NOT the operator gateway (api.lumera.help).
 *
 * The object is registered on chain under the viewer's own account and stored
 * privately, so only their wallet can retrieve it. Cascade signing is
 * cosmos-only (Keplr) — an EVM/MetaMask session cannot sign it — so this is
 * gated on a cosmos wallet. It mirrors the upload/download flow already proven
 * in useCascade, kept minimal for the two things the chat page needs.
 */

import { useCallback } from 'react'

import { useLumeraClientWrapper } from './useLumeraClientWrapper'
import useWalletConnect from './useWalletConnect'
import { CHAIN_ID, SDK_PRESET } from '@/contants/network'

const GAS_PRICE = '0.025ulume'

/** Progress points the caller can surface while the wallet signs. */
export type CascadePhase = 'encoding' | 'signing' | 'registering' | 'storing'

/** Read a Cascade download stream to bytes (the SDK returns a ReadableStream). */
async function readStream(stream: any): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

export function useWalletCascade() {
  // Load the SDK on demand — it is heavy, and only save/open need it.
  const { module, load } = useLumeraClientWrapper(false)
  const { address, walletMode, isConnected, openConnectView } = useWalletConnect()

  // Cascade is signed with a cosmos (Keplr) wallet; MetaMask/EVM cannot.
  const canUse = isConnected && walletMode === 'cosmos'

  const getModule = useCallback(async () => module || (await load()), [module, load])

  /** Register + store `bytes` under the connected wallet; returns the action_id. */
  const uploadBytes = useCallback(
    async (
      fileName: string,
      bytes: Uint8Array,
      onPhase?: (p: CascadePhase) => void,
    ): Promise<string> => {
      if (!canUse) throw new Error('Connect a Keplr wallet to save under your Cascade account.')
      const sdk = await getModule()
      if (!sdk) throw new Error('Could not load the Lumera SDK.')

      onPhase?.('encoding')
      const signer = await sdk.getKeplrSigner(CHAIN_ID)
      const batchedPrompter = await sdk.createBatchedSignaturePrompter()
      const defaultTxPrompter = (await sdk.createDefaultTxPrompter()) || undefined

      // The two prompters double as the progress signal, exactly as useCascade
      // uses them: layout/index signatures = encoding done; the tx prompt =
      // registering; the auth signature = about to hand bytes to supernodes.
      const signaturePrompter = Object.assign(
        async (context: any, sign: () => Promise<any>) => {
          onPhase?.(context?.kind === 'auth' ? 'storing' : 'signing')
          return batchedPrompter(context, sign)
        },
        { reset: () => batchedPrompter.reset?.() },
      )
      const txPrompter = async (context: any, submit: () => Promise<any>) => {
        onPhase?.('registering')
        return defaultTxPrompter ? defaultTxPrompter(context, submit) : submit()
      }

      const client = await sdk.createLumeraClient(
        { signer, address, preset: SDK_PRESET, gasPrice: GAS_PRICE },
        true,
      )
      const uploader = client.Cascade.uploader
      const prepared = await uploader.prepareFile(bytes)
      const expirationTime = Math.floor(Date.now() / 1000 + 86400 * 1.5).toString()
      const registered = await uploader.registerAction(prepared, {
        fileName,
        isPublic: false,
        expirationTime,
        signaturePrompter,
        txPrompter,
      })
      await uploader.sendFileToSupernodes(registered.actionId, registered.authSignature, bytes)
      return String(registered.actionId)
    },
    [address, canUse, getModule],
  )

  /** Fetch an object the wallet owns, by action_id, to bytes. */
  const downloadBytes = useCallback(
    async (actionId: string): Promise<Uint8Array> => {
      if (!canUse) throw new Error('Connect a Keplr wallet to open a saved chat.')
      const sdk = await getModule()
      if (!sdk) throw new Error('Could not load the Lumera SDK.')
      const signer = await sdk.getKeplrSigner(CHAIN_ID)
      const client = await sdk.createLumeraClient({
        preset: SDK_PRESET,
        signer,
        address,
        gasPrice: GAS_PRICE,
        http: { timeout: 45000, maxRetries: 3 },
      })
      const stream = await client.Cascade.downloader.download(actionId)
      return readStream(stream)
    },
    [address, canUse, getModule],
  )

  return { canUse, isConnected, walletMode, uploadBytes, downloadBytes, openConnectView }
}

export default useWalletCascade
