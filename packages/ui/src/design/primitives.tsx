'use client'

/*
 * The redesign's component vocabulary.
 *
 * Every screen is assembled from these, so a change here moves the whole hub.
 * Two rules run through all of them:
 *   - Anything a reader might compare or watch change is set in Geist Mono
 *     with tabular figures. Prose and control labels are Geist.
 *   - There is one accent family. `primary` is the teal → green gradient,
 *     everything else is a border and a text colour.
 */

import React from 'react'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ text */

/** Small-caps mono label. The recurring column head / field head of the hub. */
export function Label({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'block font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary uppercase',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** A number the reader may compare against another number. */
export function Stat({
  children,
  size = 'lg',
  tone = 'primary',
  className,
}: {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: 'primary' | 'green' | 'warn' | 'danger' | 'muted'
  className?: string
}) {
  const sizes = {
    sm: 'text-base',
    md: 'text-stat',
    lg: 'text-stat-lg',
  }
  const tones = {
    primary: 'text-text-primary',
    green: 'text-lumera-green',
    warn: 'text-warn',
    danger: 'text-danger',
    muted: 'text-text-muted',
  }
  return (
    <span
      className={cx(
        'whitespace-nowrap font-mono font-semibold tracking-[-0.02em] tnum',
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Page heading. One per screen. */
export function PageTitle({
  title,
  subtitle,
  actions,
  subtitleClassName,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  /** The design caps some screens' subtitle width (the dashboard's at 600px) and not others. */
  subtitleClassName?: string
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
      <div className="min-w-0">
        <h1 className="m-0 mb-[5px] text-title font-semibold tracking-[-0.02em] text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className={cx('m-0 text-base text-text-muted text-pretty', subtitleClassName)}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-none flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

/* ----------------------------------------------------------------- cards */

export function Card({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article'
}) {
  return (
    <Tag
      className={cx(
        'overflow-hidden rounded-card border border-line-edge bg-ink-700',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Card header: a title on the left, an affordance or status on the right. */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 border-b border-line-hairline px-[18px] py-[15px]',
        className,
      )}
    >
      {typeof title === 'string' ? (
        <h3 className="m-0 text-base leading-none font-semibold text-text-primary">{title}</h3>
      ) : (
        title
      )}
      {action}
    </div>
  )
}

/** A link-styled button for the top-right of a card header. */
export function CardAction({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
}) {
  const className =
    'cursor-pointer border-none bg-transparent p-0 text-small leading-none font-medium text-lumera-green hover:text-lumera-green-bright'
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  )
}

/**
 * One figure with its label, delta and footnote. The dashboard's top row.
 * `min-h` on label and footnote keeps a row of four aligned even when one
 * card's label wraps to two lines and another's does not.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'flat',
  foot,
  tone = 'primary',
}: {
  label: React.ReactNode
  value: React.ReactNode
  delta?: React.ReactNode
  deltaTone?: 'up' | 'down' | 'flat'
  foot?: React.ReactNode
  tone?: 'primary' | 'green'
}) {
  const deltaTones = {
    up: 'text-lumera-green',
    down: 'text-danger',
    flat: 'text-text-tertiary',
  }
  return (
    <div className="flex flex-col gap-[9px] rounded-panel border border-line-edge bg-ink-700 px-[17px] py-4">
      <Label className="min-h-6">{label}</Label>
      <div className="flex flex-col items-start gap-[7px]">
        <Stat tone={tone === 'green' ? 'green' : 'primary'}>{value}</Stat>
        <span
          className={cx(
            'font-mono text-small leading-none font-medium tnum',
            deltaTones[deltaTone],
          )}
        >
          {delta}
        </span>
      </div>
      <span className="block min-h-[33px] text-small leading-[1.3] text-text-muted">{foot}</span>
    </div>
  )
}

/** Four figures sharing one bar, divided by hairlines. Used above tables. */
export function StatStrip({
  items,
}: {
  items: Array<{ label: React.ReactNode; value: React.ReactNode; tone?: 'primary' | 'green' | 'warn' | 'muted' }>
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-panel border border-line-edge bg-ink-700 md:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={i}
          className={cx(
            'flex flex-col gap-[7px] px-[18px] py-[15px]',
            i % 2 === 0 && 'border-r border-line-hairline md:border-r',
            i < items.length - 1 && 'md:border-r md:border-line-hairline',
            i < 2 && 'border-b border-line-hairline md:border-b-0',
          )}
        >
          <Label className="min-h-6">{item.label}</Label>
          <Stat size="md" tone={item.tone ?? 'primary'}>
            {item.value}
          </Stat>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- buttons */

type ButtonVariant = 'primary' | 'solid' | 'outline' | 'ghost' | 'accent'

const buttonVariants: Record<ButtonVariant, string> = {
  // The one gradient in the system. Reserved for the single most likely
  // action on a screen.
  primary:
    'border-none bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))] text-ink-800 hover:brightness-110',
  // Flat green. Used in the header and where a gradient would sit on a
  // gradient.
  solid: 'border-none bg-lumera-green text-ink-800 hover:bg-lumera-green-bright',
  outline:
    'border border-line-edge bg-transparent text-text-muted hover:border-line-accent hover:text-text-secondary',
  ghost: 'border-none bg-transparent text-text-muted hover:text-text-primary',
  accent:
    'border border-line-accent bg-transparent text-lumera-green hover:bg-lumera-teal/15',
}

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  locked = false,
  full = false,
  className,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  /** Show a padlock: the action is real but needs a wallet first. */
  locked?: boolean
  full?: boolean
}) {
  // The design sets every button's label at line-height 1, and its small
  // buttons (Move, Follow, Copy) at medium weight rather than semibold.
  const sizes = {
    sm: 'px-[9px] py-1.5 text-small font-medium rounded-chip',
    md: 'px-[15px] py-2.5 text-base font-semibold rounded-control',
    lg: 'px-4 py-[13px] text-base font-semibold rounded-control',
  }
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center gap-[7px] leading-none whitespace-nowrap transition-colors',
        sizes[size],
        buttonVariants[variant],
        full && 'w-full',
        disabled &&
          'cursor-not-allowed border-none bg-ink-500 text-text-disabled hover:bg-ink-500 hover:brightness-100',
        className,
      )}
      {...rest}
    >
      {locked ? <LockIcon /> : null}
      {children}
    </button>
  )
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
      className="flex-none"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

/* ------------------------------------------------------------- segmented */

/** Mutually exclusive filter or mode. Never more than about six options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: Array<{ key: T; label: React.ReactNode }>
  value: T
  onChange: (key: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cx(
        'inline-flex gap-0.5 rounded-inner border border-line-hairline bg-ink-800 p-0.5',
        className,
      )}
    >
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={cx(
              'cursor-pointer rounded-[5px] border-none text-small leading-none font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-[9px] py-[5px]' : 'px-2.5 py-1.5',
              on ? 'bg-ink-600 text-text-primary' : 'bg-transparent text-text-muted hover:text-text-secondary',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- badges */

type BadgeTone = 'neutral' | 'green' | 'warn' | 'danger' | 'muted'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-line-edge text-text-tertiary',
  green: 'border-line-edge text-lumera-green',
  warn: 'border-warn-edge text-warn',
  danger: 'border-danger-edge text-danger',
  muted: 'border-line-edge text-text-muted',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex flex-none items-center rounded-[4px] border px-[5px] py-[3px] font-mono text-micro leading-none font-medium tracking-[0.08em] whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** A coloured dot with a caption. Status, deadlines, liveness. */
export function DotLabel({
  tone = 'green',
  children,
  pulse = false,
}: {
  tone?: 'green' | 'warn' | 'danger' | 'cyan' | 'muted'
  children: React.ReactNode
  pulse?: boolean
}) {
  const tones = {
    green: 'bg-lumera-green text-lumera-green',
    warn: 'bg-warn text-warn',
    danger: 'bg-danger text-danger',
    cyan: 'bg-lumera-cyan text-lumera-cyan',
    muted: 'bg-text-muted text-text-muted',
  }
  const [dot, text] = tones[tone].split(' ')
  return (
    <span className={cx('flex items-center gap-1.5 text-small leading-none font-medium', text)}>
      <span
        className={cx('h-[5px] w-[5px] flex-none rounded-full', dot, pulse && 'animate-blink')}
      />
      {children}
    </span>
  )
}

/* --------------------------------------------------------------- avatars */

/**
 * Validator mark. Falls back to monogram initials when the operator has not
 * published a Keybase picture, which is most of them.
 */
export function Avatar({
  initials,
  src,
  size = 28,
  rounded = 7,
  alt,
}: {
  initials: string
  src?: string
  size?: number
  rounded?: number
  alt?: string
}) {
  // Keybase is the only avatar source Cosmos chains have, and it rate-limits
  // and 404s often enough that a picture cannot be assumed to arrive. The
  // monogram is always rendered underneath, so a failed or slow image degrades
  // to initials rather than to an empty box.
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [src])

  return (
    <div
      className="relative flex flex-none items-center justify-center overflow-hidden border border-line-edge bg-ink-600"
      style={{ width: size, height: size, borderRadius: rounded }}
    >
      <span
        className="font-mono font-semibold text-lumera-green"
        style={{ fontSize: Math.max(10, Math.round(size * 0.45)) }}
      >
        {initials}
      </span>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ bars */

/** Single-value progress. The gradient reads as "this is yours / achieved". */
export function Bar({
  pct,
  height = 8,
  tone = 'gradient',
  className,
}: {
  pct: string | number
  height?: number
  tone?: 'gradient' | 'green' | 'warn' | 'danger' | 'muted'
  className?: string
}) {
  const tones = {
    gradient: 'bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))]',
    green: 'bg-lumera-green',
    warn: 'bg-warn',
    danger: 'bg-danger',
    muted: 'bg-neutral-bar',
  }
  const width = typeof pct === 'number' ? `${pct}%` : pct
  return (
    <div
      className={cx('overflow-hidden rounded-full bg-line-hairline', className)}
      style={{ height }}
    >
      <div className={cx('h-full transition-[width] duration-300', tones[tone])} style={{ width }} />
    </div>
  )
}

/** Multi-segment bar. Governance tallies and storage breakdowns. */
export function SegmentBar({
  segments,
  height = 9,
  radius = 3,
}: {
  segments: Array<{ width: string; className: string; title?: string }>
  height?: number
  radius?: number
}) {
  return (
    <div
      className="flex overflow-hidden bg-line-hairline"
      style={{ height, borderRadius: radius }}
    >
      {segments.map((s, i) => (
        <div key={i} className={s.className} style={{ width: s.width }} title={s.title} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- data rows */

/** Key on the left, value on the right. The drawer's workhorse. */
export function DataRow({
  label,
  value,
  tone = 'secondary',
  mono = true,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  tone?: 'primary' | 'secondary' | 'muted' | 'green' | 'warn' | 'danger'
  mono?: boolean
  className?: string
}) {
  const tones = {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    muted: 'text-text-muted',
    green: 'text-lumera-green',
    warn: 'text-warn',
    danger: 'text-danger',
  }
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-4 border-b border-line-hairline py-[9px] last:border-b-0',
        className,
      )}
    >
      <span className="flex-none text-small text-text-muted">{label}</span>
      <span
        className={cx(
          'min-w-0 text-right text-small font-medium break-words',
          mono && 'font-mono tnum',
          tones[tone],
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** A bordered well used for summaries, notes and totals inside cards. */
export function Well({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'warn' | 'danger' | 'accent'
  className?: string
}) {
  const tones = {
    neutral: 'border-line-hairline bg-ink-800',
    warn: 'border-warn-edge bg-warn/8',
    danger: 'border-danger-edge bg-danger/8',
    accent: 'border-line-accent bg-lumera-teal/12',
  }
  return (
    <div className={cx('rounded-control border px-[13px] py-3', tones[tone], className)}>
      {children}
    </div>
  )
}

/** Inline warning or error, with the icon that belongs to its tone. */
export function Notice({
  tone = 'warn',
  children,
}: {
  tone?: 'warn' | 'danger' | 'info'
  children: React.ReactNode
}) {
  const map = {
    warn: { well: 'warn' as const, text: 'text-warn', stroke: 'var(--color-warn)' },
    danger: { well: 'danger' as const, text: 'text-danger', stroke: 'var(--color-danger)' },
    info: { well: 'neutral' as const, text: 'text-text-muted', stroke: 'var(--color-text-muted)' },
  }[tone]
  return (
    <Well tone={map.well} className="flex items-start gap-[9px]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={map.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        className="mt-px flex-none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5v.01" />
      </svg>
      <span className={cx('text-small leading-[1.5] text-pretty', map.text)}>{children}</span>
    </Well>
  )
}

/* ----------------------------------------------------------------- input */

export function Field({
  label,
  hint,
  error,
  ok,
  children,
  right,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  ok?: React.ReactNode
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      {label || right ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? <Label>{label}</Label> : <span />}
          {right ? <span className="text-small text-text-tertiary">{right}</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <span className="text-small leading-[1.4] text-danger text-pretty">{error}</span>
      ) : ok ? (
        <span className="text-small leading-[1.4] text-lumera-green text-pretty">{ok}</span>
      ) : hint ? (
        <span className="text-small leading-[1.4] text-text-muted text-pretty">{hint}</span>
      ) : null}
    </div>
  )
}

export function Input({
  invalid,
  mono,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; mono?: boolean }) {
  return (
    <input
      className={cx(
        // One size class, never two: text-base and text-small together left
        // the winner to stylesheet order.
        'w-full min-w-0 rounded-control border bg-ink-800 px-[13px] py-3 leading-[normal] text-text-primary outline-none transition-colors',
        'placeholder:text-text-muted focus:border-line-accent',
        mono ? 'font-mono text-small' : 'text-base',
        invalid ? 'border-danger-edge' : 'border-line-edge',
        className,
      )}
      {...rest}
    />
  )
}

/** Amount entry: a large mono figure with its denom pinned to the right. */
export function AmountInput({
  value,
  onChange,
  denom = 'LUME',
  invalid,
  placeholder = '0.00',
  size = 'lg',
}: {
  value: string
  onChange: (v: string) => void
  denom?: string
  invalid?: boolean
  placeholder?: string
  /** lg is the transfer and staking figure; the proposal wizard's run a step down. */
  size?: 'sm' | 'md' | 'lg'
}) {
  const figure = {
    sm: 'py-3 text-[16px] leading-[normal] font-medium',
    md: 'py-[13px] text-[17px] leading-[normal] font-semibold',
    lg: 'py-[13px] text-[18px] leading-none font-semibold',
  }[size]
  return (
    <div
      className={cx(
        'flex items-center rounded-control border bg-ink-800',
        size === 'lg' ? 'px-3' : 'px-[13px]',
        invalid ? 'border-danger-edge' : 'border-line-edge focus-within:border-line-accent',
      )}
    >
      <input
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className={cx(
          'min-w-0 flex-1 border-none bg-transparent font-mono text-text-primary outline-none placeholder:text-text-disabled',
          figure,
        )}
      />
      <span className="font-mono text-small leading-none font-medium text-text-tertiary">{denom}</span>
    </div>
  )
}

const DEFAULT_STEPS: Array<[string, number]> = [
  ['25%', 0.25],
  ['50%', 0.5],
  ['75%', 0.75],
  ['MAX', 1],
]

/** 25 / 50 / 75 / MAX by default. Only shown when there is a balance to take a share of. */
export function PercentRow({
  onPick,
  steps = DEFAULT_STEPS,
}: {
  onPick: (fraction: number) => void
  steps?: Array<[string, number]>
}) {
  return (
    <div className="flex gap-1.5">
      {steps.map(([label, f]) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(f)}
          className="flex-1 cursor-pointer rounded-chip border border-line-edge bg-ink-800 py-[7px] font-mono text-small leading-none font-medium text-text-muted transition-colors hover:border-line-accent hover:text-lumera-green"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ empty/load */

export function EmptyState({
  title,
  body,
  action,
  dashed = true,
  className,
}: {
  title: React.ReactNode
  body?: React.ReactNode
  action?: React.ReactNode
  dashed?: boolean
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center gap-3 rounded-control border bg-ink-800 px-4 py-8 text-center',
        dashed ? 'border-dashed border-line-edge' : 'border-line-hairline',
        className,
      )}
    >
      <span className="text-base font-medium text-text-primary">{title}</span>
      {body ? (
        <span className="max-w-[380px] text-small leading-[1.55] text-text-muted text-pretty">
          {body}
        </span>
      ) : null}
      {action}
    </div>
  )
}

/** Shimmer placeholder sized to the content it stands in for. */
export function Skeleton({
  className,
  rounded = 'rounded-chip',
}: {
  className?: string
  rounded?: string
}) {
  return (
    <span
      className={cx('relative block overflow-hidden bg-ink-600', rounded, className)}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)]"
        style={{ animation: 'lmSweep 1.4s ease-in-out infinite' }}
      />
    </span>
  )
}

/** A table that becomes a stack of rows on narrow screens. */
export function TableScroller({
  children,
  min = 660,
  className,
}: {
  children: React.ReactNode
  min?: number
  className?: string
}) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <div style={{ minWidth: min }}>{children}</div>
    </div>
  )
}
