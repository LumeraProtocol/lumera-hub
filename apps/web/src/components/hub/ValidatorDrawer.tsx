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
import { DENOM, PORTAL_URL } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import { useHub, copyText, short } from '@lumera-hub/ui/src/hub/session'
import { Drawer } from '@lumera-hub/ui/src/hub/Drawer'
import {
  Avatar,
  Badge,
  Bar,
  Button,
  DataRow,
  Label,
  Notice,
  Skeleton,
  Well,
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
          <Button variant="outline" size="lg" className="flex-none px-5" onClick={hub.closeDrawer}>
            Close
          </Button>
          <Button
            variant="solid"
            size="lg"
            full
            onClick={() => onDelegate(validator.operatorAddress)}
          >
            Delegate here
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <Avatar
          initials={validator.initials}
          src={profile.logo ?? undefined}
          size={44}
          rounded={10}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg leading-tight font-semibold text-text-primary">
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
              className="flex items-center gap-1.5 text-small text-lumera-green"
            >
              {validator.website.replace(/^https?:\/\//, '')}
              <ExternalIcon size={11} />
            </a>
          ) : null}
        </div>
      </div>

      {validator.details ? (
        <p className="m-0 text-base leading-[1.6] text-text-secondary text-pretty">
          {validator.details}
        </p>
      ) : null}

      {validator.jailed ? (
        <Notice tone="danger">
          This validator is jailed. It is not signing blocks and is earning nothing for its
          delegators until it is unjailed.
        </Notice>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Well className="flex flex-col gap-1.5">
          <Label>Voting power</Label>
          <span className="font-mono text-stat font-semibold tnum text-text-primary">
            {validator.power.toFixed(2)}%
          </span>
          <span className="font-mono text-small tnum text-text-muted">
            {lume(validator.tokensMicro)}
          </span>
        </Well>
        <Well className="flex flex-col gap-1.5">
          <Label>Net APR</Label>
          <span className="font-mono text-stat font-semibold tnum text-lumera-green">
            {validator.apr != null ? `${validator.apr.toFixed(1)}%` : '—'}
          </span>
          <span className="font-mono text-small tnum text-text-muted">
            after {validator.commission}% commission
          </span>
        </Well>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label>Signing record</Label>
          <span
            className={`font-mono text-small font-medium tnum ${
              uptimeTone === 'green'
                ? 'text-lumera-green'
                : uptimeTone === 'warn'
                  ? 'text-warn'
                  : uptimeTone === 'danger'
                    ? 'text-danger'
                    : 'text-text-muted'
            }`}
          >
            {validator.uptime != null ? `${validator.uptime.toFixed(2)}%` : '—'}
          </span>
        </div>
        {validator.uptime != null ? (
          <Bar
            pct={validator.uptime}
            tone={uptimeTone === 'green' ? 'gradient' : uptimeTone === 'warn' ? 'warn' : 'danger'}
            height={7}
          />
        ) : null}
        <span className="text-small leading-[1.5] text-text-muted text-pretty">
          {validator.missed != null && validator.signingWindow
            ? `${validator.missed.toLocaleString('en-US')} missed of the last ${validator.signingWindow.toLocaleString('en-US')} blocks.`
            : 'The chain did not return a signing record for this validator.'}
        </span>
      </div>

      <div className="overflow-hidden rounded-control border border-line-hairline bg-ink-800 px-[13px]">
        <DataRow
          label="Self-bonded"
          value={
            profile.isLoading ? (
              <Skeleton className="inline-block h-3 w-20 align-middle" />
            ) : (
              lume(profile.selfBondedMicro)
            )
          }
        />
        <DataRow
          label="Delegators"
          value={
            profile.isLoading ? (
              <Skeleton className="inline-block h-3 w-12 align-middle" />
            ) : profile.delegators != null ? (
              profile.delegators.toLocaleString('en-US')
            ) : (
              '—'
            )
          }
        />
        <DataRow
          label="Min self-delegation"
          value={lume(validator.minSelfDelegationMicro)}
        />
        <DataRow
          label="Max commission"
          value={validator.maxCommission != null ? `${validator.maxCommission.toFixed(0)}%` : '—'}
        />
        <DataRow
          label="Max daily change"
          value={validator.maxChangeRate != null ? `${validator.maxChangeRate.toFixed(0)}%` : '—'}
        />
        <DataRow
          label="Commission changed"
          value={
            validator.commissionUpdated &&
            !validator.commissionUpdated.startsWith('0001')
              ? new Date(validator.commissionUpdated).toLocaleDateString()
              : '—'
          }
        />
        {validator.mineMicro > 0 ? (
          <DataRow label="Your delegation" value={lume(validator.mineMicro, 2)} tone="green" />
        ) : null}
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
          href={`${PORTAL_URL}validator/${validator.operatorAddress}`}
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
