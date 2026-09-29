/*
 * Shapes a SNAG season for the /snag page: which quests are live, how they
 * group into SNAG's own sections (in SNAG's order), what each one looks like,
 * and where its button takes the reader.
 *
 * Pure functions, so the rules are tested against SNAG-shaped data and the
 * server route and the page stay thin.
 */

export type SnagRule = {
  id: string
  name: string
  description?: string | null
  type: string
  amount?: string | number | null
  frequency?: string | null
  startTime?: string | null
  endTime?: string | null
  showBeforeStart?: boolean | null
  hideInUi?: boolean | null
  deletedAt?: string | null
  metadata?: { cta?: { label?: string | null; href?: string | null } | null } | null
}

export type SnagRuleGroup = {
  id: string
  name: string
  subTitle?: string | null
  sortId?: number | null
  loyaltyGroupItems?: Array<{ sortId?: number | null; loyaltyRule?: { id?: string | null } | null }> | null
}

export type SprintQuest = {
  id: string
  name: string
  description?: string
  type: string
  points: number
  frequency?: string
  endsAt?: string
  cta?: { label?: string; href: string }
}

export type SprintGroup = { id: string; name: string; subtitle?: string; quests: SprintQuest[] }

/** A rule is shown while it is running: not deleted, not hidden, not ended, started (or previewable). */
export const isLive = (rule: SnagRule, now: number): boolean => {
  if (rule.deletedAt || rule.hideInUi) return false
  if (rule.endTime && Date.parse(rule.endTime) <= now) return false
  if (rule.startTime && Date.parse(rule.startTime) > now && !rule.showBeforeStart) return false
  return true
}

const toQuest = (rule: SnagRule): SprintQuest => {
  const href = rule.metadata?.cta?.href?.trim()
  return {
    id: rule.id,
    name: rule.name.trim(),
    description: rule.description?.trim() || undefined,
    type: rule.type,
    points: Number(rule.amount) || 0,
    frequency: rule.frequency || undefined,
    endsAt: rule.endTime || undefined,
    cta: href ? { label: rule.metadata?.cta?.label?.trim() || undefined, href } : undefined,
  }
}

const bySort = (a: { sortId?: number | null }, b: { sortId?: number | null }) =>
  (a.sortId ?? 0) - (b.sortId ?? 0)

/**
 * Live quests grouped the way SNAG lays them out. A rule listed in several
 * groups shows once, in the first; live rules in no group land in a trailing
 * "More quests" section so nothing running is hidden.
 */
export function buildSprint(rules: SnagRule[], groups: SnagRuleGroup[], now = Date.now()): SprintGroup[] {
  const live = new Map(rules.filter((r) => isLive(r, now)).map((r) => [r.id, r]))
  const placed = new Set<string>()
  const out: SprintGroup[] = []

  for (const group of [...groups].sort(bySort)) {
    const quests: SprintQuest[] = []
    for (const item of [...(group.loyaltyGroupItems ?? [])].sort(bySort)) {
      const rule = item.loyaltyRule?.id ? live.get(item.loyaltyRule.id) : undefined
      if (!rule || placed.has(rule.id)) continue
      placed.add(rule.id)
      quests.push(toQuest(rule))
    }
    if (quests.length) out.push({ id: group.id, name: group.name, subtitle: group.subTitle || undefined, quests })
  }

  const rest = [...live.values()].filter((r) => !placed.has(r.id))
  if (rest.length) out.push({ id: 'more', name: 'More quests', quests: rest.map(toQuest) })
  return out
}

/* ------------------------------------------------------------- presentation */

export type QuestPlatform = 'wallet' | 'x' | 'discord' | 'other'
export type QuestStyle = { platform: QuestPlatform; kicker?: string; cta: string }

const STYLES: Record<string, QuestStyle> = {
  connected_twitter: { platform: 'x', kicker: 'X (Twitter)', cta: 'Connect X' },
  drip_x_follow: { platform: 'x', kicker: 'X (Twitter)', cta: 'Follow on X' },
  drip_x_tweet: { platform: 'x', kicker: 'X (Twitter)', cta: 'Engage on X' },
  drip_x_new_tweet: { platform: 'x', kicker: 'X (Twitter)', cta: 'Post on X' },
  connected_discord: { platform: 'discord', kicker: 'Discord', cta: 'Connect Discord' },
  discord_join: { platform: 'discord', kicker: 'Discord', cta: 'Join Discord' },
  youtube_comment: { platform: 'other', kicker: 'YouTube', cta: 'Comment' },
  youtube_subscribers: { platform: 'other', kicker: 'YouTube', cta: 'Subscribe' },
  github_repo_star: { platform: 'other', kicker: 'GitHub', cta: 'Star repo' },
  quiz: { platform: 'other', kicker: 'Quiz', cta: 'Take quiz' },
  text_input: { platform: 'other', cta: 'Submit' },
  link_click: { platform: 'other', cta: 'Open' },
  check_in: { platform: 'other', cta: 'Check in' },
}

/** How a quest is labelled, from its SNAG rule type (and, for hub quests, its CTA). */
export const questStyle = (quest: Pick<SprintQuest, 'type' | 'cta'>): QuestStyle => {
  if (quest.cta?.href && /\/wallet\/connect\b/.test(quest.cta.href)) return { platform: 'wallet', cta: 'Connect' }
  if (STYLES[quest.type]) return STYLES[quest.type]
  return { platform: 'other', cta: quest.cta?.label || 'Start' }
}

/* ------------------------------------------------------------------ routing */

export type QuestTarget = { kind: 'hub'; path: string } | { kind: 'external'; url: string }

const HUB_PAGE = /^\/loyalty\/[0-9a-f-]{36}\/[a-z-]+\/?$/i

/**
 * Where a quest's button goes. A hub verification page (`/loyalty/<rule>/<kind>`)
 * opens in the hub, on whichever hub is serving the page. Everything else —
 * SNAG-native quests (quizzes, X, Discord, …) and the wallet link, which has to
 * start from the SNAG account it links — opens the SNAG quest site.
 */
export const questTarget = (quest: Pick<SprintQuest, 'cta'>, snagSiteUrl: string): QuestTarget => {
  const href = quest.cta?.href
  if (href) {
    try {
      const url = new URL(href)
      if (/(^|\.)lumera\.io$/i.test(url.hostname) && url.hostname.startsWith('hub') && HUB_PAGE.test(url.pathname)) {
        return { kind: 'hub', path: url.pathname.replace(/\/$/, '') }
      }
      if (!/\/wallet\/connect\b/.test(url.pathname)) return { kind: 'external', url: url.toString() }
    } catch {
      // An unparseable CTA falls through to the SNAG site.
    }
  }
  return { kind: 'external', url: snagSiteUrl }
}
