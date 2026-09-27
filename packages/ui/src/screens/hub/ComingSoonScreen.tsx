'use client'

/*
 * The placeholder for modules that are announced but not shipped.
 *
 * The old version was an 80vh empty card reading "Coming soon" and nothing
 * else — the same for Sense, Inference and NFTs, so all three read as broken
 * rather than pending. Since Sense and Inference are Lumera's headline
 * differentiators, that emptiness was doing real damage.
 *
 * This says what the module is, what it will let you do, and where to follow
 * progress. It occupies a screen honestly instead of apologising for one.
 */

import React from 'react'
import { Badge, Button, Card, Label, PageTitle } from '../../design/primitives'
import { CheckIcon, ExternalIcon } from '../../design/icons'

export function ComingSoonScreen({
  name,
  tagline,
  description,
  capabilities,
  status,
  links,
}: {
  name: string
  tagline: string
  description: string
  /** What the module will do, in the reader's terms. */
  capabilities: Array<{ title: string; body: string }>
  status: string
  links?: Array<{ label: string; href: string }>
}) {
  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name}
            <Badge tone="warn">IN DEVELOPMENT</Badge>
          </span>
        }
        subtitle={tagline}
      />

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card>
          <div className="flex flex-col gap-5 px-[18px] py-5">
            <p className="m-0 max-w-[640px] text-base leading-[1.7] text-text-secondary text-pretty">
              {description}
            </p>

            <div className="flex flex-col gap-3">
              <Label>What it will do</Label>
              {capabilities.map((c) => (
                <div key={c.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-chip border border-line-accent bg-lumera-teal/14 text-lumera-green">
                    <CheckIcon size={11} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-base font-medium text-text-primary">{c.title}</span>
                    <span className="text-small leading-[1.55] text-text-muted text-pretty">
                      {c.body}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3.5">
          <Card>
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <Label>Status</Label>
              <p className="m-0 text-base leading-[1.6] text-text-secondary text-pretty">{status}</p>
            </div>
          </Card>

          {links?.length ? (
            <Card>
              <div className="flex flex-col gap-2 px-[18px] py-4">
                <Label className="mb-1">Follow progress</Label>
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-control border border-line-edge px-3 py-2.5 text-base font-medium text-text-secondary no-underline transition-colors hover:border-line-accent hover:text-lumera-green"
                  >
                    <span className="flex-1">{l.label}</span>
                    <ExternalIcon size={13} className="flex-none opacity-75" />
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Copy for each pending module, kept together so the three stay consistent. */
export const COMING_SOON = {
  sense: {
    name: 'Sense',
    tagline: 'Near-duplicate detection and provenance for anything stored on Lumera.',
    description:
      'Sense fingerprints a file so the network can answer two questions about it: has something near-identical been registered before, and who registered it first. The fingerprint is perceptual rather than a plain hash, so a re-encode, a crop or a watermark still matches the original.',
    capabilities: [
      {
        title: 'Check a file before you register it',
        body: 'Get a rareness score against everything already fingerprinted on the network.',
      },
      {
        title: 'Prove you were first',
        body: 'Registration writes a timestamped fingerprint on chain, so provenance does not depend on a platform staying online.',
      },
      {
        title: 'Track where a work reappears',
        body: 'Later registrations that match your fingerprint are linked back to it.',
      },
    ],
    status:
      'The fingerprinting pipeline runs on supernodes today. The hub interface for submitting and reading results is not yet wired up.',
  },
  inference: {
    name: 'Inference',
    tagline: 'Run models on the network the same way you store files on it.',
    description:
      'Inference turns supernode capacity into a metered compute market. Requests are paid for in LUME, executed by operators who have staked against their uptime, and settled on chain, so an agent can pay for its own compute without an account anywhere.',
    capabilities: [
      {
        title: 'Submit a job and pay per inference-second',
        body: 'No subscription and no key — the request is signed by your wallet.',
      },
      {
        title: 'Pick capacity by price and latency',
        body: 'Operators publish both; the network routes to whichever you asked for.',
      },
      {
        title: 'Verifiable execution',
        body: 'Results carry the operator signature, and a disputed result can be re-run by others.',
      },
    ],
    status:
      'Compute metering is live on testnet supernodes. The hub cannot yet submit jobs or show their results.',
  },
  nfts: {
    name: 'NFTs',
    tagline: 'Collectibles whose media actually lives on the network that mints them.',
    description:
      'Most NFTs point at a URL that can go away. On Lumera the media is stored on Cascade and the fingerprint is registered with Sense, so the token, the file and its provenance are held by the same network rather than three unrelated ones.',
    capabilities: [
      {
        title: 'Mint against permanent storage',
        body: 'The media is chunked and replicated across supernodes before the token exists.',
      },
      {
        title: 'Provenance built in',
        body: 'Every mint carries the Sense fingerprint taken at registration.',
      },
      {
        title: 'Browse and transfer from the hub',
        body: 'Holdings appear alongside your balances rather than in a separate app.',
      },
    ],
    status:
      'Depends on Sense reaching general availability. No on-chain module has shipped yet.',
  },
} as const
