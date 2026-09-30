'use client'

/*
 * Snag — the Sprint quest board.
 *
 * A Sprint is the live SNAG season: quests (connect a wallet, link X, join
 * Discord, take a quiz, bridge from Injective…) worth points, grouped into
 * SNAG's own sections. The page reads it live from SNAG through this app's
 * server; where that is unavailable the screen says so rather than inventing
 * quests someone would then try to complete.
 *
 * Quests the hub can run itself open in place: the row expands to show the
 * quest's steps, each with its own action, and the reader never leaves the page
 * except for the sign-in windows X and Discord insist on.
 */

import React from 'react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageTitle,
  Skeleton,
  StatStrip,
  cx,
} from '../../design/primitives'
import { CheckIcon, DiscordIcon, ExternalIcon, StarIcon, XIcon } from '../../design/icons'

export type SnagPlatform = 'wallet' | 'x' | 'discord' | 'other'

/** One step of a quest done in place. */
export type SnagStep = {
  title: string
  hint?: React.ReactNode
  done?: boolean
  action?: {
    label: string
    onClick: () => void
    /** Working on it: the button shows as busy. */
    busy?: boolean
    disabled?: boolean
    /** Opens another site (in a small window). */
    external?: boolean
    /** A secondary action, drawn outlined. */
    secondary?: boolean
  }
}

export type SnagQuest = {
  id: string
  platform: SnagPlatform
  title: string
  /** The completion condition, shown under the title. */
  note?: string
  points: number
  /** Small header above the title (e.g. "YouTube", "Quiz"); defaults by platform. */
  kicker?: string
  /** Button text; defaults by platform. */
  ctaLabel?: string
  /** The button leaves the hub (another site, or SNAG in a window of its own). */
  external?: boolean
  completed?: boolean
  /** SNAG is still verifying a submission. */
  pending?: boolean
  /** Starts a quest that has no steps here (a hub page, the SNAG site). */
  onStart?: () => void
  /** The quest's steps, when it is done in place. */
  steps?: SnagStep[]
  /** Its steps are showing. */
  open?: boolean
  onToggle?: () => void
  /** Under the steps: what is happening now, or what went wrong. */
  status?: { tone: 'info' | 'danger'; text: string } | null
}

/** The reader's own standing, shown under the title. */
export type SnagScore =
  | { state: 'disconnected'; onConnect: () => void }
  | {
      state: 'loading' | 'ready'
      /** e.g. "EXP". */
      currency: string
      points?: number
      /** Their place, e.g. "3" or "5000+"; none until they have points. */
      rankText?: string | null
      completed?: number
      total?: number
      wallet?: string
    }

export type SnagLeader = { rank: number; name: string; points: number; you?: boolean }

export type SnagLeaderboard = {
  loading?: boolean
  currency: string
  rows: SnagLeader[]
  /** The reader, when they are not in `rows`. */
  you?: { rankText: string | null; name: string; points: number } | null
}

export type SnagGroup = {
  id: string
  label: string
  subtitle?: string
  quests: SnagQuest[]
}

/** The small platform header above a quest's title; wallet quests have none. */
const PLATFORM_LABEL: Record<SnagPlatform, string | null> = {
  wallet: null,
  x: 'X (Twitter)',
  discord: 'Discord',
  other: null,
}

/** The button's label when the quest does not name one. */
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

function StepRow({ step, index }: { step: SnagStep; index: number }) {
  const a = step.action
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cx(
            'mt-px flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full font-mono text-small font-semibold',
            step.done ? 'bg-lumera-green text-ink-800' : 'border border-line-edge text-text-secondary',
          )}
          aria-hidden="true"
        >
          {step.done ? <CheckIcon size={12} /> : index + 1}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cx('text-base leading-[1.35] font-medium', step.done ? 'text-text-muted' : 'text-text-primary')}>
            {step.title}
          </span>
          {step.hint ? <span className="text-small leading-[1.5] text-text-muted text-pretty">{step.hint}</span> : null}
        </div>
      </div>
      {a && !step.done ? (
        <div className="flex flex-none pl-[34px] sm:pl-0">
          <Button
            variant={a.secondary ? 'outline' : 'solid'}
            size="sm"
            onClick={a.onClick}
            disabled={a.disabled || a.busy}
            className="min-w-[96px]"
          >
            {a.busy ? 'Working…' : a.label}
            {a.external && !a.busy ? <ExternalIcon size={11} /> : null}
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function QuestRow({ quest }: { quest: SnagQuest }) {
  const kicker = quest.kicker ?? PLATFORM_LABEL[quest.platform]
  const inPlace = Boolean(quest.steps?.length && quest.onToggle)
  const open = inPlace && quest.open && !quest.completed

  return (
    <Card className={cx('bg-ink-800', quest.completed && 'opacity-75', open && 'border-line-accent')}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
        {/* Reward pill */}
        <div className="flex h-[52px] w-[88px] flex-none items-center justify-center gap-1.5 rounded-control bg-ink-600 font-mono text-lg font-semibold tnum text-text-primary">
          {quest.points.toLocaleString('en-US')}
          <StarIcon size={13} className="text-lumera-green" />
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {kicker ? (
            <span className="flex items-center gap-1.5 font-mono text-small font-medium tracking-wide text-text-secondary uppercase">
              <PlatformMark platform={quest.platform} />
              {kicker}
            </span>
          ) : null}
          <span className="text-base leading-[1.35] font-medium text-text-primary text-pretty">{quest.title}</span>
          {quest.note ? (
            <span className="line-clamp-2 text-small leading-[1.5] text-text-muted text-pretty">{quest.note}</span>
          ) : null}
        </div>

        {/* Action */}
        <div className="flex flex-none items-center sm:justify-end">
          {quest.completed ? (
            <span className="flex items-center gap-1.5 text-small font-medium text-lumera-green">
              <CheckIcon size={13} />
              Completed
            </span>
          ) : quest.pending && !open ? (
            <span className="text-small text-text-tertiary">Verifying…</span>
          ) : inPlace ? (
            <Button
              variant={open ? 'outline' : 'solid'}
              onClick={quest.onToggle}
              aria-expanded={open}
              aria-controls={`quest-${quest.id}`}
            >
              {open ? 'Close' : (quest.ctaLabel ?? CONNECT_LABEL[quest.platform])}
            </Button>
          ) : (
            <Button variant="solid" onClick={quest.onStart} disabled={!quest.onStart}>
              {quest.ctaLabel ?? CONNECT_LABEL[quest.platform]}
              {quest.external ? <ExternalIcon size={12} /> : null}
            </Button>
          )}
        </div>
      </div>

      {open ? (
        <div id={`quest-${quest.id}`} className="animate-fade border-t border-line-hairline px-4 pb-4">
          <ol className="m-0 flex list-none flex-col divide-y divide-line-hairline p-0">
            {quest.steps!.map((step, i) => (
              <StepRow key={i} step={step} index={i} />
            ))}
          </ol>
          {quest.status ? (
            <div className="pt-1">
              <Notice tone={quest.status.tone === 'danger' ? 'danger' : 'info'}>{quest.status.text}</Notice>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

function ScoreStrip({ score }: { score: SnagScore }) {
  if (score.state === 'disconnected') {
    return (
      <Card className="flex flex-col gap-3 px-[18px] py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-base text-text-muted text-pretty">
          Connect a wallet to see your points and your place on the leaderboard.
        </span>
        <Button variant="solid" onClick={score.onConnect} className="self-start sm:self-auto">
          Connect wallet
        </Button>
      </Card>
    )
  }
  return (
    <StatStrip
      loading={score.state === 'loading'}
      items={[
        { label: 'Your points', value: `${(score.points ?? 0).toLocaleString('en-US')} ${score.currency}`, tone: 'green' },
        { label: 'Rank', value: score.rankText ? `#${score.rankText}` : '—', tone: score.rankText ? 'primary' : 'muted' },
        { label: 'Quests done', value: score.total ? `${score.completed ?? 0} / ${score.total}` : '—' },
        { label: 'Wallet', value: score.wallet || '—', tone: 'muted' },
      ]}
    />
  )
}

function LeaderRow({ row, rankText }: { row: SnagLeader; rankText?: string }) {
  return (
    <li
      className={cx(
        'flex items-center gap-3 border-b border-line-hairline px-[18px] py-2.5 last:border-b-0',
        row.you && 'bg-lumera-teal/10',
      )}
    >
      <span
        className={cx(
          'w-8 flex-none font-mono text-small font-semibold tnum',
          row.rank <= 3 ? 'text-lumera-green' : 'text-text-tertiary',
        )}
      >
        #{rankText ?? row.rank}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-base text-text-primary">{row.name}</span>
        {row.you ? <Badge tone="green">YOU</Badge> : null}
      </span>
      <span className="flex-none font-mono text-small font-medium tnum text-text-secondary">
        {row.points.toLocaleString('en-US')}
      </span>
    </li>
  )
}

function Leaderboard({ board }: { board: SnagLeaderboard }) {
  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader
        title="Leaderboard"
        action={<span className="font-mono text-small text-text-tertiary">{board.currency}</span>}
      />
      {board.loading ? (
        <div className="flex flex-col gap-3 px-[18px] py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : board.rows.length ? (
        <ol className="m-0 list-none p-0">
          {board.rows.map((row, i) => (
            <LeaderRow key={i} row={row} />
          ))}
          {board.you ? (
            <>
              <li
                className="border-b border-line-hairline px-[18px] py-1 text-center text-small text-text-disabled"
                aria-hidden="true"
              >
                ⋯
              </li>
              <LeaderRow
                row={{ rank: Number.MAX_SAFE_INTEGER, name: board.you.name || 'You', points: board.you.points, you: true }}
                rankText={board.you.rankText ?? '—'}
              />
            </>
          ) : null}
        </ol>
      ) : (
        <p className="m-0 px-[18px] py-4 text-small text-text-muted">
          No points yet this Sprint — complete a quest to lead the board.
        </p>
      )}
    </Card>
  )
}

export function SnagScreen({
  loading,
  available,
  unavailableReason,
  sprintLabel,
  summary,
  notice,
  groups,
  siteUrl,
  onOpenSite,
  score,
  leaderboard,
}: {
  loading?: boolean
  /** False when the loyalty backend is not reachable from this deployment. */
  available: boolean
  unavailableReason?: string
  /** The active sprint's name, shown as a badge next to the title. */
  sprintLabel: string | null
  /** A line under the title, e.g. the reader's progress. */
  summary?: string | null
  /** A note above the quests. */
  notice?: React.ReactNode
  groups: SnagGroup[]
  /** The SNAG quest site, linked from the header. */
  siteUrl?: string
  /** Opens the SNAG site (e.g. in a popup); defaults to a new tab. */
  onOpenSite?: () => void
  /** The reader's own points and place. */
  score?: SnagScore
  /** The Sprint's top players, beside the quests. */
  leaderboard?: SnagLeaderboard
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
        subtitle={summary || 'Connect your accounts and complete the quests below to earn Sprint points.'}
        actions={
          siteUrl ? (
            <Button
              variant="outline"
              onClick={() => (onOpenSite ? onOpenSite() : window.open(siteUrl, '_blank', 'noopener,noreferrer'))}
            >
              Open Snag
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
      ) : notice ? (
        <Notice tone="info">{notice}</Notice>
      ) : null}

      {available && score ? <ScoreStrip score={score} /> : null}

      <div
        className={cx(
          'grid grid-cols-1 items-start gap-[22px]',
          available && leaderboard && 'lg:grid-cols-[minmax(0,1fr)_320px]',
        )}
      >
        <div className="flex min-w-0 flex-col gap-[22px]">
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
                  <div className="flex flex-col gap-1">
                    <h2 className="m-0 font-mono text-[19px] leading-none font-normal text-text-tertiary">{group.label}</h2>
                    {group.subtitle ? (
                      <span className="text-small text-text-muted text-pretty">{group.subtitle}</span>
                    ) : null}
                  </div>
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
        {available && leaderboard ? <Leaderboard board={leaderboard} /> : null}
      </div>
    </div>
  )
}
