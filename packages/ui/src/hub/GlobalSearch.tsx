'use client'

/*
 * One search box for the whole hub.
 *
 * The old app had a search dialog that only matched blocks and transactions.
 * This resolves anything the reader can name — a validator, a proposal, a
 * stored file, a hash, a bare address, a block height — and routes on pick.
 * A raw address offers to open it in watch mode, which is the fastest path
 * into read-only browsing.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../design/primitives'
import { SearchIcon } from '../design/icons'
import { LUMERA_ADDRESS } from './session'

export type SearchHit = {
  key: 'tx' | 'validator' | 'proposal' | 'file' | 'address' | 'block'
  tag: string
  tagClass: string
  title: string
  sub: string
  when?: string
  onPick: () => void
}

export function GlobalSearch({
  buildHits,
  onWatchAddress,
  onOpenBlock,
  onSeeAll,
}: {
  /** Returns matches for a query. Screens supply the corpus. */
  buildHits: (query: string) => SearchHit[]
  onWatchAddress?: (address: string) => void
  onOpenBlock?: (height: string) => void
  onSeeAll?: (query: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl-K focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close on an outside click rather than on blur, so a click that lands on a
  // result still registers.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const trimmed = query.trim()

  const hits = useMemo(() => {
    if (!trimmed) return []
    const found = buildHits(trimmed)
    const extras: SearchHit[] = []
    if (LUMERA_ADDRESS.test(trimmed) && onWatchAddress) {
      extras.push({
        key: 'address',
        tag: 'ADDRESS',
        tagClass: 'text-text-secondary',
        title: trimmed,
        sub: 'Open this address read-only',
        when: 'Watch',
        onPick: () => onWatchAddress(trimmed),
      })
    }
    if (/^#?\d[\d,]{3,}$/.test(trimmed) && onOpenBlock) {
      const height = trimmed.replace(/[#,]/g, '')
      extras.push({
        key: 'block',
        tag: 'BLOCK',
        tagClass: 'text-text-secondary',
        title: `#${Number(height).toLocaleString('en-US')}`,
        sub: 'Jump to block',
        onPick: () => onOpenBlock(height),
      })
    }
    return [...extras, ...found]
  }, [buildHits, onOpenBlock, onWatchAddress, trimmed])

  const shown = hits.slice(0, 7)

  const pick = (hit: SearchHit) => {
    hit.onPick()
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!shown.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (c + 1) % shown.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (c - 1 + shown.length) % shown.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = shown[cursor] ?? shown[0]
      if (hit) pick(hit)
    }
  }

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1 sm:max-w-[430px]">
      <SearchIcon
        size={15}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setCursor(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && !!trimmed}
        aria-controls="hub-search-results"
        aria-label="Search the hub"
        placeholder="Search address or tx"
        className="w-full rounded-control border border-line-hairline bg-ink-800 py-[9px] pr-[52px] pl-[34px] text-base text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-line-accent focus:shadow-[0_0_0_3px_rgba(7,138,138,.14)]"
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-[4px] border border-line-edge px-[5px] py-1 font-mono text-micro font-medium text-text-muted sm:block">
        ⌘K
      </span>

      {open && trimmed ? (
        <div
          id="hub-search-results"
          role="listbox"
          className="animate-fade absolute top-[46px] right-0 left-0 z-60 overflow-hidden rounded-[11px] border border-line-edge bg-ink-700 shadow-[0_18px_44px_rgba(0,8,20,.6)]"
        >
          {shown.map((hit, i) => (
            <div
              key={`${hit.key}-${i}`}
              role="option"
              aria-selected={i === cursor}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(hit)
              }}
              onMouseEnter={() => setCursor(i)}
              className={cx(
                'flex cursor-pointer items-center gap-3 border-b border-line-hairline px-3.5 py-[11px] last:border-b-0',
                i === cursor && 'bg-ink-600',
              )}
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
          ))}

          {!shown.length ? (
            <div className="flex flex-col gap-1.5 px-3.5 py-[22px] text-center">
              <span className="text-base leading-[1.3] font-medium text-text-primary">
                No match for “{trimmed}”
              </span>
              <span className="text-small leading-[1.4] text-text-muted">
                Try a transaction hash, validator, proposal, file or address.
              </span>
            </div>
          ) : null}

          {hits.length > 7 && onSeeAll ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onSeeAll(trimmed)
                setQuery('')
                setOpen(false)
              }}
              className="w-full cursor-pointer border-none bg-ink-800 px-3.5 py-2.5 text-center text-small font-medium text-lumera-green hover:bg-ink-600"
            >
              See all {hits.length} results →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
