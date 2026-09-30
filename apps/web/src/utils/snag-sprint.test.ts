import { describe, expect, it } from 'vitest';

import { buildSprint, firstQuests, isLive, questStyle, questTarget, type SnagRule, type SnagRuleGroup } from './snag-sprint';

const NOW = Date.parse('2026-09-29T12:00:00Z');
const rule = (id: string, extra: Partial<SnagRule> = {}): SnagRule => ({ id, name: `Rule ${id}`, type: 'quiz', amount: '10', ...extra });
const group = (id: string, sortId: number, items: Array<[string, number]>, name = `Group ${id}`): SnagRuleGroup => ({
  id,
  name,
  sortId,
  loyaltyGroupItems: items.map(([ruleId, s]) => ({ sortId: s, loyaltyRule: { id: ruleId } })),
});

describe('isLive', () => {
  it('drops ended, hidden, deleted and not-yet-started rules', () => {
    expect(isLive(rule('a'), NOW)).toBe(true);
    expect(isLive(rule('a', { endTime: '2026-06-24T04:00:00Z' }), NOW)).toBe(false);
    expect(isLive(rule('a', { hideInUi: true }), NOW)).toBe(false);
    expect(isLive(rule('a', { deletedAt: '2026-01-01T00:00:00Z' }), NOW)).toBe(false);
    expect(isLive(rule('a', { startTime: '2026-10-01T00:00:00Z' }), NOW)).toBe(false);
    expect(isLive(rule('a', { startTime: '2026-10-01T00:00:00Z', showBeforeStart: true }), NOW)).toBe(true);
  });
});

describe('buildSprint', () => {
  it('orders sections and their quests the way SNAG does', () => {
    const sprint = buildSprint(
      [rule('a'), rule('b'), rule('c')],
      [group('g2', 2, [['c', 1]], 'Social'), group('g1', 1, [['b', 2], ['a', 1]], 'Foundation / Onboarding')],
      NOW,
    );
    expect(sprint.map((g) => g.name)).toEqual(['Foundation / Onboarding', 'Social']);
    expect(sprint[0].quests.map((q) => q.id)).toEqual(['a', 'b']);
  });

  it('hides ended quests and leaves out sections with nothing live', () => {
    const sprint = buildSprint(
      [rule('old', { endTime: '2026-06-24T04:00:00Z' }), rule('live')],
      [group('g1', 1, [['old', 1]]), group('g2', 2, [['live', 1]])],
      NOW,
    );
    expect(sprint.map((g) => g.id)).toEqual(['g2']);
  });

  it('shows a rule once even if SNAG lists it in two sections, and keeps ungrouped live rules', () => {
    const sprint = buildSprint([rule('a'), rule('loose')], [group('g1', 1, [['a', 1]]), group('g2', 2, [['a', 1]])], NOW);
    expect(sprint.map((g) => g.id)).toEqual(['g1', 'more']);
    expect(sprint[1].quests.map((q) => q.id)).toEqual(['loose']);
  });

  it('carries points, trimmed names and the CTA through', () => {
    const [g] = buildSprint(
      [rule('a', { name: ' Connect Twitter/X to Snag profile ', amount: '15', metadata: { cta: { label: 'Claim', href: 'https://x.test/a' } } })],
      [group('g', 1, [['a', 1]])],
      NOW,
    );
    expect(g.quests[0]).toMatchObject({ name: 'Connect Twitter/X to Snag profile', points: 15, cta: { label: 'Claim', href: 'https://x.test/a' } });
  });
});

describe('firstQuests', () => {
  const season = buildSprint(
    [rule('a'), rule('b'), rule('c'), rule('d')],
    [group('g1', 1, [['a', 1], ['b', 2]]), group('g2', 2, [['c', 1], ['d', 2]])],
    NOW,
  );

  it('keeps the first N quests in order, across sections', () => {
    const cut = firstQuests(season, 3);
    expect(cut.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(cut.flatMap((g) => g.quests.map((q) => q.id))).toEqual(['a', 'b', 'c']);
  });

  it('drops sections left empty by the cut', () => {
    expect(firstQuests(season, 2).map((g) => g.id)).toEqual(['g1']);
  });

  it('leaves the season whole without a positive limit', () => {
    expect(firstQuests(season, 0)).toBe(season);
    expect(firstQuests(season, Number.NaN)).toBe(season);
  });
});

describe('questStyle', () => {
  it('labels quests by their SNAG rule type', () => {
    expect(questStyle({ type: 'connected_twitter' })).toMatchObject({ platform: 'x', cta: 'Connect X' });
    expect(questStyle({ type: 'discord_join' })).toMatchObject({ platform: 'discord', cta: 'Join Discord' });
    expect(questStyle({ type: 'quiz' })).toMatchObject({ kicker: 'Quiz', cta: 'Take quiz' });
    expect(questStyle({ type: 'external_rule', cta: { label: 'Claim', href: 'https://hub.lumera.io/loyalty/x/stake' } })).toMatchObject({ cta: 'Claim' });
  });

  it('treats the wallet-link quest as a wallet connect', () => {
    expect(questStyle({ type: 'external_rule', cta: { href: 'https://hub.lumera.io/loyalty/wallet/connect' } })).toEqual({ platform: 'wallet', cta: 'Connect' });
  });
});

describe('questTarget', () => {
  const SITE = 'https://snag.example';
  const id = '362997f0-a566-43ff-b69a-c3dbf84ea4ce';

  it('opens a hub verification page inside whichever hub is serving', () => {
    expect(questTarget({ cta: { href: `https://hub.lumera.io/loyalty/${id}/stake-for-full-season` } }, SITE)).toEqual({ kind: 'hub', path: `/loyalty/${id}/stake-for-full-season` });
    expect(questTarget({ cta: { href: `https://hub.testnet.lumera.io/loyalty/${id}/text-input` } }, SITE)).toEqual({ kind: 'hub', path: `/loyalty/${id}/text-input` });
  });

  it('sends the wallet link and SNAG-native quests to the SNAG site', () => {
    expect(questTarget({ cta: { href: 'https://hub.lumera.io/loyalty/wallet/connect' } }, SITE)).toEqual({ kind: 'external', url: SITE });
    expect(questTarget({}, SITE)).toEqual({ kind: 'external', url: SITE });
  });

  it('follows an external CTA as-is', () => {
    expect(questTarget({ cta: { href: 'https://medium.com/@lumera' } }, SITE)).toEqual({ kind: 'external', url: 'https://medium.com/@lumera' });
  });
});
