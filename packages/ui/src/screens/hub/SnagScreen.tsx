'use client'

/*
 * Snag — the Sprint quest board.
 *
 * A Sprint is a run of onboarding quests (connect a wallet, link X, link
 * Discord, follow the account…), each worth points, grouped into sections. The
 * quests themselves live in SNAG, reached through this app's own API routes.
 * Those routes need a database and SNAG credentials, so on a deployment without
 * them there is nothing real to show — the screen says so plainly rather than
 * inventing quests someone would then try to complete.
 */

import React from 'react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Notice,
  PageTitle,
  Skeleton,
} from '../../design/primitives'
import { CheckIcon, DiscordIcon, ExternalIcon, StarIcon, XIcon } from '../../design/icons'

export type SnagPlatform = 'wallet' | 'x' | 'discord' | 'other'

export type SnagQuest = {
  id: string
  platform: SnagPlatform
  title: string
  /** The completion condition, shown under the title. */
  note?: string
  points: number
  completed?: boolean
  onStart?: () => void
}

export type SnagGroup = {
  id: string
  label: string
  quests: SnagQuest[]
}

/** The small platform header above a quest's title; wallet quests have none. */
const PLATFORM_LABEL: Record<SnagPlatform, string | null> = {
  wallet: null,
  x: 'X (Twitter)',
  discord: 'Discord',
  other: null,
}

/** The connect button's label, per platform. */
const CONNECT_LABEL: Record<SnagPlatform, string> = {
  wallet: 'Connect',
  x: 'Connect X',
  discord: 'Connect Discord',
  other: 'Start',
}

function PlatformMark({ platform }: { platform: SnagPlatform }) {
  if (platform === 'x') return <XIcon size={13} />
  if (platform === 'discord') return <DiscordIcon size={15} />
  return null
}

function QuestRow({ quest }: { quest: SnagQuest }) {
  const label = PLATFORM_LABEL[quest.platform]
  return (
    <Card className="bg-ink-800">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
        {/* Reward pill */}
        <div className="flex h-[52px] w-[88px] flex-none items-center justify-center gap-1.5 rounded-control bg-ink-600 font-mono text-lg font-semibold tnum text-text-primary">
          {quest.points.toLocaleString('en-US')}
          <StarIcon size={13} className="text-lumera-green" />
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {label ? (
            <span className="flex items-center gap-1.5 font-mono text-small font-medium tracking-wide text-text-secondary uppercase">
              <PlatformMark platform={quest.platform} />
              {label}
            </span>
          ) : null}
          <span className="text-base leading-[1.35] font-medium text-text-primary text-pretty">
            {quest.title}
          </span>
          {quest.note ? (
            <span className="text-small leading-[1.5] text-text-muted text-pretty">{quest.note}</span>
          ) : null}
        </div>

        {/* Action */}
        <div className="flex flex-none items-center sm:justify-end">
          {quest.completed ? (
            <span className="flex items-center gap-1.5 text-small text-text-muted">
              <CheckIcon size={13} className="text-lumera-green" />
              Completed
            </span>
          ) : (
            <Button variant="accent" onClick={quest.onStart} disabled={!quest.onStart}>
              {CONNECT_LABEL[quest.platform]}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function SnagScreen({
  loading,
  available,
  unavailableReason,
  sprintLabel,
  sprintEnds,
  groups,
  rulesUrl,
}: {
  loading?: boolean
  /** False when the loyalty backend is not reachable from this deployment. */
  available: boolean
  unavailableReason?: string
  /** The active sprint's name, shown as a badge next to the title. */
  sprintLabel: string | null
  sprintEnds: string | null
  groups: SnagGroup[]
  rulesUrl?: string
}) {
  const hasQuests = groups.some((g) => g.quests.length > 0)

  return (
    <div className="animate-fade flex flex-col gap-[22px]">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            Sprint
            {sprintLabel ? <Badge tone="green">{sprintLabel.toUpperCase()}</Badge> : null}
          </span>
        }
        subtitle={
          sprintEnds
            ? `Complete the quests below to earn points before the Sprint closes on ${sprintEnds}.`
            : 'Connect your accounts and complete the quests below to earn Sprint points.'
        }
        actions={
          rulesUrl ? (
            <Button variant="outline" onClick={() => window.open(rulesUrl, '_blank', 'noreferrer')}>
              Sprint rules
              <ExternalIcon size={13} />
            </Button>
          ) : undefined
        }
      />

      {!available ? (
        <Notice tone="info">
          {unavailableReason ||
            'The quest service is not configured on this deployment, so no Sprint is available here. The rest of the hub is unaffected.'}
        </Notice>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-ink-800">
              <div className="flex items-center gap-5 p-4">
                <Skeleton className="h-[52px] w-[88px] flex-none" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-9 w-28 flex-none" />
              </div>
            </Card>
          ))}
        </div>
      ) : hasQuests ? (
        groups
          .filter((g) => g.quests.length > 0)
          .map((group) => (
            <section key={group.id} className="flex flex-col gap-3.5">
              <h2 className="m-0 font-mono text-[19px] leading-none font-normal text-text-tertiary">
                {group.label}
              </h2>
              <div className="flex flex-col gap-3">
                {group.quests.map((quest) => (
                  <QuestRow key={quest.id} quest={quest} />
                ))}
              </div>
            </section>
          ))
      ) : (
        <EmptyState
          title={available ? 'No quests in this Sprint yet' : 'Sprint unavailable here'}
          body={
            available
              ? 'When a Sprint opens, its quests appear here with what each one is worth.'
              : 'This deployment has no connection to the quest service, so there is nothing to list. The rest of the hub is unaffected.'
          }
        />
      )}
    </div>
  )
}
