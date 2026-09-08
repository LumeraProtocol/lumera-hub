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
import { Card, EmptyState, Input, PageTitle, Segmented, Skeleton, cx } from '../../design/primitives'
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
            <span className="flex flex-wrap items-baseline gap-2">
              {hits.length} {hits.length === 1 ? 'result' : 'results'} for
              <span className="font-mono text-text-secondary">{trimmed}</span>
            </span>
          ) : (
            'Search the hub'
          )
        }
        subtitle="Across transactions, validators, proposals and files."
      />

      <div className="relative max-w-[520px]">
        <SearchIcon
          size={15}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search address, tx, validator, proposal or file"
          aria-label="Search the hub"
          autoFocus
          className="pl-[34px]"
        />
      </div>

      {/* Counts sit in the labels so the spread is readable before any row is. */}
      <Segmented
        value={kind}
        onChange={(k) => setKind(k as Kind)}
        options={KINDS.map((k) => ({
          key: k.key,
          label: `${k.label} ${counts[k.key] ?? 0}`,
        }))}
      />

      <Card>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-hairline px-3.5 py-[13px] last:border-b-0">
              <Skeleton className="h-[26px] w-[66px]" />
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
              className="flex cursor-pointer items-center gap-3 border-b border-line-hairline px-3.5 py-[11px] last:border-b-0 hover:bg-ink-600"
            >
              <span
                className={cx(
                  'w-[66px] flex-none rounded-[4px] border border-line-edge py-[5px] text-center font-mono text-micro font-medium tracking-[0.08em]',
                  hit.tagClass,
                )}
              >
                {hit.tag}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-base leading-[1.3] font-medium text-text-primary">
                  {hit.title}
                </span>
                <span className="truncate font-mono text-small leading-[1.3] text-text-muted">
                  {hit.sub}
                </span>
              </div>
              {hit.when ? (
                <span className="flex-none text-small text-text-tertiary">{hit.when}</span>
              ) : null}
            </div>
          ))
        ) : (
          <div className="p-[18px]">
            <EmptyState
              title={trimmed ? 'Nothing matches' : 'Start typing to search'}
              body="Search covers transaction hashes, validator names, proposal titles and summaries, and file names and content IDs."
            />
          </div>
        )}
      </Card>
    </div>
  )
}
