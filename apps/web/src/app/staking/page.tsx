// apps/web/src/app/staking/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'

import useWalletConnect from '@/hooks/useWalletConnect'
import useDelegate from '@/hooks/useDelegate'
import useStaking from '@/hooks/useStaking'
import useAccountInfo from '@/hooks/useAccountInfo'
import useUnbond from '@/hooks/useUnbond'
import useRedelegate from '@/hooks/useRedelegate'
import { RATE_VALUE } from '@/contants'
import { DENOM } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import { getAvailableBalances, getDelegations } from '@/utils/portfolio'
import { consensusAddressFromPubkey } from '@/utils/consensus-address'
import {
  StakingScreen,
  type StakingMode,
  type ValidatorRow,
} from '@lumera-hub/ui/src/screens/hub/StakingScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { TxDrawer } from '@/components/hub/TxDrawer'

const lume = (micro: number, digits = 2) =>
  formatNumber(micro / RATE_VALUE, { decimalsLength: digits, currency: 'en-US' })

const compact = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

const initialsOf = (name: string) => {
  const words = String(name).replace(/[^A-Za-z0-9. ]/g, '').trim().split(/[\s.]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '··'
}

export default function Page() {
  const { address, isEvm } = useWalletConnect()
  const hub = useHub()
  const staking = useStaking(address, isEvm)
  const { accountInfo, fetchData } = useAccountInfo(
    hub.isWatching ? { address: hub.address } : {},
  )

  const [mode, setMode] = useState<StakingMode>('delegate')
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [sourceKey, setSourceKey] = useState<string>('')
  const [amount, setAmount] = useState('')

  const availableMicro = getAvailableBalances(accountInfo)
  const stakedMicro = getDelegations(accountInfo)

  const delegate = useDelegate({
    availableAmount: `${availableMicro / RATE_VALUE}`,
    callback: fetchData,
    validators: staking.activeValidators,
    totalValidators: staking.totalValidators,
    isValidatorDataLoading: staking.isLoading,
  })
  const unbond = useUnbond({
    callback: () => {
      staking.fetchUnbondingDelegations()
      fetchData()
    },
  })
  const redelegate = useRedelegate({
    callback: () => {
      staking.fetchUnbondingDelegations()
      fetchData()
    },
  })

  useEffect(() => {
    document.title = 'Staking - Lumera Hub'
  }, [])

  /*
   * The signing window and the number of missed blocks come back on separate
   * endpoints keyed by consensus address, so uptime is only shown where both
   * resolved. Rendering "100%" for a validator whose record did not load would
   * be worse than an em dash.
   */
  const signWindow = Number(staking.slashingParams?.signed_blocks_window) || 0
  const missedByConsAddress = useMemo(() => {
    const map = new Map<string, number>()
    ;(staking.signingInfos || []).forEach((info: { address: string; missed_blocks_counter: string }) => {
      map.set(info.address, Number(info.missed_blocks_counter) || 0)
    })
    return map
  }, [staking.signingInfos])

  const totalBondedMicro = Number(staking.bondedTokens) || 0
  const netAprValue = Number(staking.apr) || 0

  const myStakeByValidator = useMemo(() => {
    const map = new Map<string, number>()
    ;(accountInfo?.delegations || []).forEach((d) => {
      map.set(d.delegation.validator_address, Number(d.balance.amount) || 0)
    })
    return map
  }, [accountInfo?.delegations])

  const validators: ValidatorRow[] = useMemo(() => {
    const list = staking.activeValidators || []
    return list
      .map((v) => {
        const tokens = Number(v.tokens) || 0
        const power = totalBondedMicro ? (tokens / totalBondedMicro) * 100 : 0
        const commission = Math.round(Number(v.commission?.commission_rates?.rate || 0) * 100)
        const mine = myStakeByValidator.get(v.operator_address) || 0
        const consAddress = consensusAddressFromPubkey(v.consensus_pubkey?.key || '')
        const missed = consAddress ? missedByConsAddress.get(consAddress) : undefined
        const uptime =
          signWindow > 0 && missed != null ? ((signWindow - missed) / signWindow) * 100 : null
        const name = v.description?.moniker || v.operator_address
        return {
          key: v.operator_address,
          name,
          initials: initialsOf(name),
          power,
          commission,
          apr: netAprValue ? netAprValue * (1 - commission / 100) : null,
          uptime,
          mine,
          note:
            mine > 0
              ? `${lume(mine, 0)} ${DENOM.replace(/^u/, '').toUpperCase()} delegated`
              : missed != null
                ? missed === 0
                  ? 'No missed blocks'
                  : `${missed.toLocaleString('en-US')} missed block${missed === 1 ? '' : 's'}`
                : 'Active',
        } as ValidatorRow
      })
      .sort((a, b) => b.power - a.power)
  }, [
    missedByConsAddress,
    myStakeByValidator,
    netAprValue,
    signWindow,
    staking.activeValidators,
    totalBondedMicro,
  ])

  const selected = validators.find((v) => v.key === selectedKey) || validators[0]
  const mine = validators.filter((v) => v.mine > 0)
  const source = mine.find((v) => v.key === sourceKey) || mine[0]

  // What the amount field is allowed to reach depends on which action it is.
  const available =
    mode === 'undelegate' ? stakedMicro : mode === 'redelegate' ? (source?.mine ?? 0) : availableMicro

  const verb = mode === 'undelegate' ? 'Undelegate' : mode === 'redelegate' ? 'Redelegate' : 'Delegate'
  const amountNumber = parseFloat(amount.replace(/,/g, '')) || 0

  /*
   * All three actions land in the same drawer. Only the intent text and the
   * broadcast call differ, so the review → sign → receipt sequence is written
   * once in TxDrawer rather than three times here.
   */
  const submit = () => {
    if (!selected) return
    const intent = {
      title: `${verb} ${amountNumber.toLocaleString('en-US', { maximumFractionDigits: 2 })} LUME`,
      lineLabel: mode === 'redelegate' ? 'Move' : 'Validator',
      line:
        mode === 'redelegate' && source
          ? `${source.name} → ${selected.name}`
          : selected.name,
      ...(mode === 'redelegate'
        ? { extra: { k: 'Unbonding', v: 'None — instant', tone: 'green' as const } }
        : mode === 'undelegate'
          ? { extra: { k: 'Available in', v: '21 days', tone: 'warn' as const } }
          : {}),
    }
    hub.gate(intent, () => {
      // Push the choice into whichever hook will broadcast it.
      if (mode === 'delegate') {
        delegate.handleInputChange('validator', selected.key)
        delegate.handleStakingAmountChange(String(amountNumber))
      } else if (mode === 'undelegate') {
        unbond.handleInputChange('validator', selected.key)
        unbond.handleInputChange('amount', String(amountNumber))
      } else if (source) {
        redelegate.handleInputChange('sourceValidator', source.key)
        redelegate.handleInputChange('destinationValidator', selected.key)
        redelegate.handleInputChange('amount', String(amountNumber))
      }
      hub.openDrawer({ kind: 'tx', intent })
    })
  }

  const broadcast =
    mode === 'delegate'
      ? delegate.handleSendClick
      : mode === 'undelegate'
        ? unbond.handleSendClick
        : redelegate.handleSendClick

  const txError =
    mode === 'delegate' ? delegate.error : mode === 'undelegate' ? unbond.error : redelegate.error
  const txHash =
    mode === 'delegate'
      ? delegate.transactionHash
      : mode === 'undelegate'
        ? unbond.transactionHash
        : redelegate.transactionHash

  return (
    <>
      <Helmet>
        <title>Staking - Lumera Hub</title>
      </Helmet>
      <StakingScreen
        loading={staking.isLoading}
        validators={validators}
        totalBonded={
          totalBondedMicro ? `${compact(totalBondedMicro / RATE_VALUE)} LUME` : '—'
        }
        netApr={netAprValue ? `${netAprValue.toFixed(1)}%` : '—'}
        unbondingDays={
          staking.params?.unbonding_time
            ? `${Math.round(parseInt(staking.params.unbonding_time, 10) / 86400)} days`
            : '21 days'
        }
        myStake={stakedMicro ? `${lume(stakedMicro, 0)} LUME` : '—'}
        available={available}
        mode={mode}
        onModeChange={(m) => {
          setMode(m)
          setAmount('')
        }}
        selected={selected}
        onSelect={setSelectedKey}
        source={source}
        onSourceChange={setSourceKey}
        amount={amount}
        onAmountChange={setAmount}
        onSubmit={submit}
      />

      <TxDrawer
        onBroadcast={broadcast}
        error={txError}
        transactionHash={txHash}
        onDone={() => {
          setAmount('')
          fetchData()
        }}
      />
    </>
  )
}
