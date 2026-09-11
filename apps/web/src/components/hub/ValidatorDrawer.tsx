'use client'

/*
 * Validator profile.
 *
 * Everything here is read from the chain: voting power and tokens from the
 * staking module, missed blocks from the slashing module's signing window,
 * self-bond from the operator's own delegation, and the picture from Keybase
 * when the operator publishes an identity.
 *
 * Nothing is filled in when a value is absent — a validator whose signing
 * record did not resolve shows an em dash rather than an assumed 100%.
 */

import React from 'react'

import useValidatorProfile from '@/hooks/useValidatorProfile'
import { RATE_VALUE } from '@/contants'
import { DENOM } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import { explorerValidatorUrl } from '@/utils/explorer'
import { useHub, copyText, short } from '@lumera-hub/ui/src/hub/session'
import { Drawer, drawerButton } from '@lumera-hub/ui/src/hub/Drawer'
import {
  Avatar,
  Badge,
  Bar,
  Label,
  Notice,
  Skeleton,
  cx,
} from '@lumera-hub/ui/src/design/primitives'
import { ExternalIcon } from '@lumera-hub/ui/src/design/icons'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

export type ValidatorDetail = {
  operatorAddress: string
  name: string
  initials: string
  identity?: string
  website?: string
  details?: string
  jailed: boolean
  /** Share of bonded stake, 0–100. */
  power: number
  /** Bonded to this validator, micro-denom. */
  tokensMicro: number
  /** Commission rate as a percentage, 0–100. */
  commission: number
  maxCommission: number | null
  maxChangeRate: number | null
  commissionUpdated: string | null
  /** Blocks missed inside the signing window. */
  missed: number | null
  signingWindow: number | null
  uptime: number | null
  apr: number | null
  minSelfDelegationMicro: number | null
  /** The reader's own delegation to this validator, micro-denom. */
  mineMicro: number
}

const lume = (micro: number | null, digits = 0) =>
  micro == null
    ? '—'
    : `${formatNumber(micro / RATE_VALUE, { decimalsLength: digits, currency: 'en-US' })} ${TOKEN}`

export function ValidatorDrawer({
  validator,
  onDelegate,
}: {
  validator?: ValidatorDetail
  onDelegate: (operatorAddress: string) => void
}) {
  const hub = useHub()
  const open = hub.drawer?.kind === 'validator'
  const profile = useValidatorProfile(
    open ? validator?.operatorAddress : undefined,
    validator?.identity,
  )

  if (!open || !validator) return null

  const uptimeTone =
    validator.uptime == null
      ? 'muted'
      : validator.uptime >= 99.95
        ? 'green'
        : validator.uptime >= 99.7
          ? 'warn'
          : 'danger'

  return (
    <Drawer
      title="Validator"
      onClose={hub.closeDrawer}
      footer={
        <>
          <button type="button" onClick={hub.closeDrawer} className={drawerButton.secondary}>
            Close
          </button>
          <button
            type="button"
            onClick={() => onDelegate(validator.operatorAddress)}
            className={drawerButton.primary}
          >
            Delegate here
          </button>
        </>
      }
    >
      <div className="flex items-center gap-[13px]">
        <Avatar
          initials={validator.initials}
          src={profile.logo ?? undefined}
          size={44}
          rounded={11}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] leading-[1.2] font-semibold text-text-primary">
              {validator.name}
            </span>
            {validator.jailed ? <Badge tone="danger">JAILED</Badge> : null}
          </div>
          {validator.website ? (
            <a
              href={
                validator.website.startsWith('http')
                  ? validator.website
                  : `https://${validator.website}`
              }
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-mono text-small leading-none text-lumera-green"
            >
              {validator.website.replace(/^https?:\/\//, '')}
              <ExternalIcon size={11} />
            </a>
          ) : (
            <span className="font-mono text-small leading-none text-text-muted">
              {short(validator.operatorAddress, 16, 6)}
            </span>
          )}
        </div>
      </div>

      {validator.details ? (
        <p className="m-0 text-base leading-[1.65] text-text-secondary text-pretty">
          {validator.details}
        </p>
      ) : null}

      {validator.jailed ? (
        <Notice tone="danger">
          This validator is jailed. It is not signing blocks and is earning nothing for its
          delegators until it is unjailed.
        </Notice>
      ) : null}

      {/* Four figures in one bordered grid; the 1px gaps are the rules. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[9px] border border-line-hairline bg-line-hairline sm:grid-cols-4">
        {[
          { k: 'POWER', v: `${validator.power.toFixed(2)}%`, tone: 'text-text-primary' },
          { k: 'FEE', v: `${validator.commission}%`, tone: 'text-text-primary' },
          {
            k: 'APR',
            v: validator.apr != null ? `${validator.apr.toFixed(1)}%` : '—',
            tone: 'text-lumera-green',
          },
          {
            k: 'YOURS',
            v: validator.mineMicro > 0 ? lume(validator.mineMicro).replace(` ${TOKEN}`, '') : '—',
            tone: 'text-text-secondary',
          },
        ].map((c) => (
          <div key={c.k} className="flex flex-col gap-1.5 bg-ink-800 px-3 py-[11px]">
            <span className="font-mono text-micro leading-none font-medium tracking-[0.08em] text-text-muted">
              {c.k}
            </span>
            <span className={cx('font-mono text-lg leading-none font-semibold tnum', c.tone)}>{c.v}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[9px] border border-line-hairline bg-ink-800 p-3.5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <Label>Signing record</Label>
          <span
            className={cx(
              'font-mono text-small leading-none font-medium tnum',
              uptimeTone === 'green'
                ? 'text-lumera-green'
                : uptimeTone === 'warn'
                  ? 'text-warn'
                  : uptimeTone === 'danger'
                    ? 'text-danger'
                    : 'text-text-muted',
            )}
          >
            {validator.uptime != null ? `${validator.uptime.toFixed(2)}%` : '—'}
          </span>
        </div>
        {validator.uptime != null ? (
          <div className="mb-[11px]">
            <Bar
              pct={validator.uptime}
              tone={uptimeTone === 'green' ? 'gradient' : uptimeTone === 'warn' ? 'warn' : 'danger'}
              height={7}
            />
          </div>
        ) : null}
        <span className="text-small leading-[1.5] text-text-muted text-pretty">
          {validator.missed != null && validator.signingWindow
            ? `${validator.missed.toLocaleString('en-US')} missed of the last ${validator.signingWindow.toLocaleString('en-US')} blocks.`
            : 'The chain did not return a signing record for this validator.'}
        </span>
      </div>

      <div className="overflow-hidden rounded-[9px] border border-line-hairline bg-ink-800">
        {[
          { k: 'Bonded to it', v: lume(validator.tokensMicro) },
          {
            k: 'Self-bonded',
            v: profile.isLoading ? null : lume(profile.selfBondedMicro),
            wide: 'w-20',
          },
          {
            k: 'Delegators',
            v: profile.isLoading
              ? null
              : profile.delegators != null
                ? profile.delegators.toLocaleString('en-US')
                : '—',
            wide: 'w-12',
          },
          { k: 'Min self-delegation', v: lume(validator.minSelfDelegationMicro) },
          {
            k: 'Max commission',
            v: validator.maxCommission != null ? `${validator.maxCommission.toFixed(0)}%` : '—',
          },
          {
            k: 'Max daily change',
            v: validator.maxChangeRate != null ? `${validator.maxChangeRate.toFixed(0)}%` : '—',
          },
          {
            k: 'Commission changed',
            v:
              validator.commissionUpdated && !validator.commissionUpdated.startsWith('0001')
                ? new Date(validator.commissionUpdated).toLocaleDateString()
                : '—',
          },
          ...(validator.mineMicro > 0
            ? [{ k: 'Your delegation', v: lume(validator.mineMicro, 2), green: true }]
            : []),
        ].map((r) => (
          <div
            key={r.k}
            className="flex items-baseline justify-between gap-[18px] border-b border-ink-500 px-3.5 py-[11px] last:border-b-0"
          >
            <span className="flex-none text-base leading-[1.4] text-text-tertiary">{r.k}</span>
            {r.v == null ? (
              <Skeleton className={cx('inline-block h-3 align-middle', r.wide)} />
            ) : (
              <span
                className={cx(
                  'text-right font-mono text-base leading-[1.45] font-medium tnum [overflow-wrap:anywhere]',
                  'green' in r && r.green ? 'text-lumera-green' : 'text-text-primary',
                )}
              >
                {r.v}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Operator address</Label>
        <button
          type="button"
          onClick={async () => {
            const ok = await copyText(validator.operatorAddress)
            hub.flash(ok ? 'Address copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
          }}
          className="cursor-pointer rounded-control border border-line-edge bg-ink-800 px-3 py-2.5 text-left font-mono text-small break-all text-text-secondary hover:border-line-accent"
        >
          {validator.operatorAddress}
        </button>
        <a
          href={explorerValidatorUrl(validator.operatorAddress)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-small font-medium text-lumera-green"
        >
          Open {short(validator.operatorAddress, 12, 6)} in the explorer
          <ExternalIcon size={11} />
        </a>
      </div>
    </Drawer>
  )
}
