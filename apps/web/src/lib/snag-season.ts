/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/snag-season.ts

import client from '@/lib/snag';
import { buildSprint, type SnagRule, type SnagRuleGroup, type SprintGroup, type SprintQuest } from '@/utils/snag-sprint';

/*
 * The live SNAG season (rules + sections, and the currency they pay in), shared
 * by /api/snag/sprint, the quest actions and the leaderboard. It changes rarely and is the same for every reader, so it is
 * cached in memory for a few minutes and fetched once however many requests
 * arrive at the same moment.
 */

const SEASON_TTL_MS = 5 * 60 * 1000;
const MAX_RULE_PAGES = 20;

type Season = { groups: SprintGroup[]; currencyId: string | null };

let cached: { at: number; season: Season } | null = null;
let inFlight: Promise<Season> | null = null;

export const snagOrgId = () => process.env.SNAG_ORGANIZATION_ID || undefined;
export const snagWebsiteId = () => process.env.SNAG_WEBSITE_ID || undefined;

/** Where SNAG-native quests are completed: the configured site, else the website's hosted page. */
export const snagSiteUrl = () =>
  (process.env.SNAG_SITE_URL || (snagWebsiteId() ? `https://${snagWebsiteId()}-preview.snag-render.com` : '')).replace(/\/+$/, '');

/** The currency most of the season's quests pay out in (e.g. EXP). */
function mainCurrency(rules: SnagRule[]): string | null {
  const counts = new Map<string, number>();
  for (const rule of rules) {
    if (rule.loyaltyCurrencyId && !rule.deletedAt) {
      counts.set(rule.loyaltyCurrencyId, (counts.get(rule.loyaltyCurrencyId) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

async function loadSeason(): Promise<Season> {
  const rules: SnagRule[] = [];
  let startingAfter = '';
  for (let page = 0; page < MAX_RULE_PAGES; page += 1) {
    const res: any = await client.get(`api/loyalty/rules?limit=50${startingAfter}`);
    const data: SnagRule[] = res?.data ?? [];
    rules.push(...data);
    if (!res?.hasNextPage || !data.length) break;
    startingAfter = `&startingAfter=${data[data.length - 1].id}`;
  }
  const groupsRes: any = await client.loyalty.ruleGroups.getRuleGroups();
  return {
    groups: buildSprint(rules, (groupsRes?.data ?? []) as SnagRuleGroup[]),
    currencyId: process.env.SNAG_CURRENCY_ID || mainCurrency(rules),
  };
}

async function seasonData(): Promise<Season> {
  if (cached && Date.now() - cached.at < SEASON_TTL_MS) return cached.season;
  inFlight ??= loadSeason()
    .then((season) => {
      cached = { at: Date.now(), season };
      return season;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export const season = async (): Promise<SprintGroup[]> => (await seasonData()).groups;

/** The currency the season's quests pay out in, which the leaderboard ranks by. */
export const seasonCurrencyId = async (): Promise<string | null> => (await seasonData()).currencyId;

/** A live quest of this season, by id. */
export async function findQuest(id: string): Promise<SprintQuest | null> {
  for (const group of await season()) {
    const quest = group.quests.find((q) => q.id === id);
    if (quest) return quest;
  }
  return null;
}
