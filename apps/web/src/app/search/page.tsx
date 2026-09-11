'use client';

/*
 * Search results.
 *
 * The header's dropdown answers a query it can satisfy in a few rows. This is
 * where a broad query goes, and it searches real data rather than the shell's
 * short list of destinations: every active validator by name, every proposal by
 * title and summary, plus the things recognisable from their shape alone — a
 * transaction hash, an address, a block height.
 *
 * The query lives in the URL so a result set can be linked to and reloaded.
 */

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import useStaking from '@/hooks/useStaking';
import useGovernances from '@/hooks/useGovernances';
import { SearchScreen } from '@lumera-hub/ui/src/screens/hub/SearchScreen';
import type { SearchHit } from '@lumera-hub/ui/src/hub/GlobalSearch';
import { LUMERA_ADDRESS, short } from '@lumera-hub/ui/src/hub/session';
import { useHub } from '@lumera-hub/ui/src/hub/session';
import { readableStatus } from '@/utils/governance-view';

const TX_HASH = /^[0-9A-Fa-f]{40,64}$/;
const BLOCK_HEIGHT = /^#?\d[\d,]{3,}$/;

/** One line of a summary or bio under a result, as the design shows it. */
const clip = (text: string, max = 180): string | undefined => {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return undefined;
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const hub = useHub();
  const query = params.get('q') ?? '';

  const { activeValidators, isLoading: validatorsLoading } = useStaking();
  const { governances, isLoading: proposalsLoading } = useGovernances();

  useEffect(() => {
    document.title = query ? `${query} - Search - Lumera Hub` : 'Search - Lumera Hub';
  }, [query]);

  /** Replace rather than push, so typing does not fill the back stack. */
  const setQuery = useCallback(
    (q: string) => {
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    },
    [router],
  );

  const hits = useMemo((): SearchHit[] => {
    const raw = query.trim();
    if (!raw) return [];
    const q = raw.toLowerCase();
    const found: SearchHit[] = [];

    // Things recognisable from their shape, offered before any text match.
    if (TX_HASH.test(raw)) {
      found.push({
        key: 'tx',
        tag: 'TX',
        tagClass: 'text-lumera-green',
        title: short(raw, 10, 6),
        sub: 'Open transaction',
        onPick: () => router.push(`/tx/${raw}`),
      });
    }
    if (LUMERA_ADDRESS.test(raw)) {
      found.push({
        key: 'address',
        tag: 'ADDRESS',
        tagClass: 'text-text-secondary',
        title: raw,
        sub: 'Open this address read-only',
        when: 'Watch',
        onPick: () => {
          hub.watch(raw);
          router.push('/wallet');
        },
      });
    }
    if (BLOCK_HEIGHT.test(raw)) {
      const height = raw.replace(/[#,]/g, '');
      found.push({
        key: 'block',
        tag: 'BLOCK',
        tagClass: 'text-text-secondary',
        title: `#${Number(height).toLocaleString('en-US')}`,
        sub: 'Jump to block',
        onPick: () => router.push(`/blocks/${height}`),
      });
    }

    for (const v of activeValidators ?? []) {
      const moniker = v.description?.moniker ?? '';
      if (!moniker.toLowerCase().includes(q)) continue;
      found.push({
        key: 'validator',
        tag: 'VALIDATOR',
        tagClass: 'text-text-tertiary',
        title: moniker,
        sub: v.operator_address,
        body: clip((v.description as { details?: string } | undefined)?.details ?? ''),
        onPick: () => router.push(`/staking/${v.operator_address}`),
      });
    }

    for (const p of governances ?? []) {
      const title = p.title || `Proposal ${p.id}`;
      const summary = p.summary ?? '';
      if (!`${title} ${summary}`.toLowerCase().includes(q)) continue;
      found.push({
        key: 'proposal',
        tag: 'PROPOSAL',
        tagClass: 'text-warn',
        title,
        sub: `#${p.id} · ${readableStatus(p.status)}`,
        body: clip(summary),
        onPick: () => router.push(`/governance/${p.id}`),
      });
    }

    return found;
  }, [activeValidators, governances, hub, query, router]);

  return (
    <SearchScreen
      query={query}
      onQueryChange={setQuery}
      hits={hits}
      loading={Boolean(query.trim()) && (validatorsLoading || proposalsLoading)}
    />
  );
}

export default function Page() {
  // useSearchParams needs a boundary; without one the route opts out of
  // static rendering entirely and the build warns.
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}
