'use client'

/*
 * The search results screen.
 *
 * The header's search box answers the common case — you know what you want and
 * the first few matches contain it. This is the other case: a broad query, or
 * more matches than a dropdown should hold. It shows every hit, grouped by what
 * kind of thing it is, with counts so the shape of the result set is visible
 * before you read any of it.
 *
 * Presentational only. The corpus is assembled by the page, which is what holds
 * the chain data.
 */

import React from 'react'
import { PageTitle, Skeleton, cx } from '../../design/primitives'
import { SearchIcon } from '../../design/icons'
import type { SearchHit } from '../../hub/GlobalSearch'

/** The kinds the design filters by, in its order. */
const KINDS = [
  { key: 'all', label: 'All' },
  { key: 'tx', label: 'Transactions' },
  { key: 'validator', label: 'Validators' },
  { key: 'proposal', label: 'Proposals' },
  { key: 'file', label: 'Files' },
] as const

type Kind = (typeof KINDS)[number]['key']

export function SearchScreen({
  query,
  onQueryChange,
  hits,
  loading,
}: {
  query: string
  onQueryChange: (q: string) => void
  hits: SearchHit[]
  loading?: boolean
}) {
  const [kind, setKind] = React.useState<Kind>('all')

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: hits.length }
    for (const h of hits) c[h.key] = (c[h.key] ?? 0) + 1
    return c
  }, [hits])

  const shown = kind === 'all' ? hits : hits.filter((h) => h.key === kind)
  const trimmed = query.trim()

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title={
          trimmed ? (
            <>
              {shown.length} {shown.length === 1 ? 'result for' : 'results for'}{' '}
              <span className="text-lumera-green">{trimmed}</span>
            </>
          ) : (
            'Search the hub'
          )
        }
        subtitle="Across transactions, validators, proposals and files."
      />

      <div className="flex items-center gap-3">
        <div className="relative max-w-[460px] flex-1">
          <SearchIcon
            size={15}
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-text-muted"
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Refine your search…"
            aria-label="Search the hub"
            autoFocus
            className="w-full rounded-control border border-line-edge bg-ink-800 py-3 pr-3.5 pl-9 text-base leading-[normal] text-text-primary outline-none placeholder:text-text-muted focus:border-line-accent"
          />
        </div>
      </div>

      {/* Counts sit in the labels so the spread is readable before any row is. */}
      <div className="flex flex-wrap items-center gap-[7px]">
        {KINDS.map((k) => {
          const on = k.key === kind
          return (
            <button
              key={k.key}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(k.key)}
              className={cx(
                'cursor-pointer rounded-inner border border-line-edge px-3 py-[7px] text-small leading-none font-medium transition-colors',
                on
                  ? 'bg-ink-600 text-text-primary'
                  : 'bg-transparent text-text-muted hover:text-text-secondary',
              )}
            >
              {k.label} {counts[k.key] ?? 0}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 border-b border-line-hairline px-[18px] py-[15px]">
              <Skeleton className="h-[22px] w-[74px]" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))
        ) : shown.length ? (
          shown.map((hit, i) => (
            <div
              key={`${hit.key}-${i}`}
              role="button"
              tabIndex={0}
              onClick={hit.onPick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  hit.onPick()
                }
              }}
              className="flex cursor-pointer gap-3.5 border-b border-line-hairline px-[18px] py-[15px] transition-colors hover:bg-ink-600"
            >
              <span
                className={cx(
                  'flex h-[22px] w-[74px] flex-none items-center justify-center rounded-[4px] border border-line-edge font-mono text-micro leading-none font-medium tracking-[0.08em]',
                  hit.tagClass,
                )}
              >
                {hit.tag}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <span className="text-base leading-[1.35] font-medium text-text-primary text-pretty">
                  {hit.title}
                </span>
                <span className="font-mono text-small leading-[1.3] text-text-muted [overflow-wrap:anywhere]">
                  {hit.sub}
                </span>
                {hit.body ? (
                  <span className="text-small leading-[1.55] text-text-tertiary text-pretty">
                    {hit.body}
                  </span>
                ) : null}
              </div>
              {hit.when ? (
                <span className="flex-none text-small leading-none text-text-tertiary">
                  {hit.when}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-[9px] px-5 py-14 text-center">
            <span className="text-lg leading-[1.3] font-medium text-text-primary">
              {trimmed ? 'Nothing matches' : 'Start typing to search'}
            </span>
            {/* Only what the page actually searches: files are not indexed
                here, and transactions are found by hash, not description. */}
            <span className="max-w-[380px] text-base leading-[1.55] text-text-muted text-pretty">
              Search covers transaction hashes, addresses and block heights, validator names, and
              proposal titles and summaries.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
