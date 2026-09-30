/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/snag-season.ts

import client from '@/lib/snag';
import { buildSprint, type SnagRule, type SnagRuleGroup, type SprintGroup, type SprintQuest } from '@/utils/snag-sprint';

/*
 * The live SNAG season (rules + sections), shared by /api/snag/sprint and the
 * quest actions. It changes rarely and is the same for every reader, so it is
 * cached in memory for a few minutes and fetched once however many requests
 * arrive at the same moment.
 */

const SEASON_TTL_MS = 5 * 60 * 1000;
const MAX_RULE_PAGES = 20;

let cached: { at: number; groups: SprintGroup[] } | null = null;
let inFlight: Promise<SprintGroup[]> | null = null;

export const snagOrgId = () => process.env.SNAG_ORGANIZATION_ID || undefined;
export const snagWebsiteId = () => process.env.SNAG_WEBSITE_ID || undefined;

/** Where SNAG-native quests are completed: the configured site, else the website's hosted page. */
export const snagSiteUrl = () =>
  (process.env.SNAG_SITE_URL || (snagWebsiteId() ? `https://${snagWebsiteId()}-preview.snag-render.com` : '')).replace(/\/+$/, '');

async function loadSeason(): Promise<SprintGroup[]> {
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
  return buildSprint(rules, (groupsRes?.data ?? []) as SnagRuleGroup[]);
}

export async function season(): Promise<SprintGroup[]> {
  if (cached && Date.now() - cached.at < SEASON_TTL_MS) return cached.groups;
  inFlight ??= loadSeason()
    .then((groups) => {
      cached = { at: Date.now(), groups };
      return groups;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** A live quest of this season, by id. */
export async function findQuest(id: string): Promise<SprintQuest | null> {
  for (const group of await season()) {
    const quest = group.quests.find((q) => q.id === id);
    if (quest) return quest;
  }
  return null;
}
