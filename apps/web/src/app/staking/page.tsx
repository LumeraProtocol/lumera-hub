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
import useChainParams, { formatDuration } from '@/hooks/useChainParams'
import useValidatorLogos from '@/hooks/useValidatorLogos'
import { RATE_VALUE } from '@/contants'
import { DENOM } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import { getQuiet } from '@/utils/api'
import { getAvailableBalances, getDelegations, getRewards } from '@/utils/portfolio'
import { consensusAddressFromPubkey } from '@/utils/consensus-address'
import {
  StakingScreen,
  type StakingMode,
  type ValidatorRow,
} from '@lumera-hub/ui/src/screens/hub/StakingScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { TxDrawer } from '@/components/hub/TxDrawer'
import { ValidatorDrawer, type ValidatorDetail } from '@/components/hub/ValidatorDrawer'
import { netApr } from '@/utils/staking-apr'

const lume = (micro: number, digits = 2) =>
  formatNumber(micro / RATE_VALUE, { decimalsLength: digits, currency: 'en-US' })

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const initialsOf = (name: string) => {
  const words = String(name).replace(/[^A-Za-z0-9. ]/g, '').trim().split(/[\s.]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '··'
}

export default function Page() {
  const { address, isEvm } = useWalletConnect()
  const hub = useHub()
  const staking = useStaking(address, isEvm)
  const { params: chainParams } = useChainParams()
  const logos = useValidatorLogos(staking.activeValidators)
  const {
    accountInfo,
    fetchData,
    handleClaimButtonClick,
    transactionHash: claimHash,
    errorClaim,
  } = useAccountInfo(hub.isWatching ? { address: hub.address } : {})

  const [mode, setMode] = useState<StakingMode>('delegate')
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [sourceKey, setSourceKey] = useState<string>('')
  const [amount, setAmount] = useState('')

  const availableMicro = getAvailableBalances(accountInfo)
  const stakedMicro = getDelegations(accountInfo)
  const rewardsMicro = getRewards(accountInfo)
  // Validators with a non-empty reward balance — the claim summary's "across N".
  const rewardValidators = useMemo(
    () =>
      (accountInfo?.rewards || []).filter((r) =>
        (r.reward || []).some((c) => Number(c.amount) > 0),
      ).length,
    [accountInfo?.rewards],
  )

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
  // The chain's figure is gross. The card says net, so take commission off —
  // through the shared helper, so this and the dashboard cannot drift apart.
  const grossApr = Number(staking.apr) || 0
  // Weighted over the active set, not every registered validator: only bonded
  // validators charge commission on bonded stake, and including the rest would
  // give a different answer here than the dashboard's for the same label.
  const netAprValue = netApr(grossApr, staking.activeValidators) ?? 0

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
          logo: logos[v.operator_address],
          power,
          commission,
          // Off the gross figure, not the net one: netAprValue already has the
          // network's average commission removed, so using it here would
          // discount every row twice.
          apr: grossApr ? grossApr * (1 - commission / 100) : null,
          uptime,
          mine,
          missed: missed ?? null,
          note:
            mine > 0
              ? `${lume(mine, 0)} ${DENOM.replace(/^u/, '').toUpperCase()} delegated`
              : missed != null
                ? missed === 0
                  ? 'No missed blocks'
                  : `${missed.toLocaleString('en-US')} missed block${missed === 1 ? '' : 's'}`
                : 'Active',
        } as ValidatorRow & { missed: number | null }
      })
      .sort((a, b) => b.power - a.power)
  }, [
    grossApr,
    logos,
    missedByConsAddress,
    myStakeByValidator,
    signWindow,
    staking.activeValidators,
    totalBondedMicro,
  ])

  const mine = validators.filter((v) => v.mine > 0)
  // Undelegate acts on the selected validator, so it must default to one the
  // wallet actually has stake on — not validators[0], the highest-power
  // validator, which the user may not have delegated to at all.
  const selected =
    validators.find((v) => v.key === selectedKey) ||
    (mode === 'undelegate' ? mine[0] : undefined) ||
    validators[0]
  const source = mine.find((v) => v.key === sourceKey) || mine[0]

  // What the amount field is allowed to reach depends on which action it is.
  // Undelegate can only release the stake on the SELECTED validator, not the
  // wallet's total stake across all of them.
  const available =
    mode === 'undelegate'
      ? (selected?.mine ?? 0)
      : mode === 'redelegate'
        ? (source?.mine ?? 0)
        : availableMicro

  const verb =
    mode === 'undelegate'
      ? 'Undelegate'
      : mode === 'redelegate'
        ? 'Redelegate'
        : mode === 'claim'
          ? 'Claim'
          : 'Delegate'
  const amountNumber = parseFloat(amount.replace(/,/g, '')) || 0

  // Prefer the params useStaking already fetched; fall back to the shared
  // chain-params read. Never to a literal.
  // useStaking seeds params with a zero-filled placeholder before the chain
  // answers, so a non-positive reading here means "not loaded", not "zero".
  const stakingUnbonding = parseInt(
    String(staking.params?.unbonding_time ?? '').replace(/s$/, ''),
    10,
  )
  const unbondingSeconds =
    (Number.isFinite(stakingUnbonding) && stakingUnbonding > 0 ? stakingUnbonding : null) ??
    chainParams.unbondingSeconds
  const unbondingLabel = formatDuration(unbondingSeconds)

  // Redelegated stake can move again once the entry matures, one unbonding
  // period from now.
  const lockDate = unbondingSeconds
    ? (() => {
        const d = new Date(Date.now() + unbondingSeconds * 1000)
        return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      })()
    : null

  /*
   * Redelegations already open between the chosen pair, which is what the
   * design's "slots free" counts down from — each pair allows max_entries at a
   * time. The chain answers "not found", not an empty list, when there are none.
   */
  const [pairUsed, setPairUsed] = useState<number | null>(null)
  const sourceKeyForPair = source?.key
  const selectedKeyForPair = selected?.key
  useEffect(() => {
    const delegator = hub.address
    if (
      mode !== 'redelegate' ||
      !delegator ||
      !sourceKeyForPair ||
      !selectedKeyForPair ||
      sourceKeyForPair === selectedKeyForPair
    ) {
      setPairUsed(null)
      return
    }
    let cancelled = false
    getQuiet(
      `/cosmos/staking/v1beta1/delegators/${delegator}/redelegations?src_validator_addr=${sourceKeyForPair}&dst_validator_addr=${selectedKeyForPair}`,
    )
      .then((res) => {
        if (cancelled) return
        const responses: Array<{ entries?: unknown[] }> = res?.data?.redelegation_responses ?? []
        setPairUsed(responses.reduce((n, r) => n + (r.entries?.length ?? 0), 0))
      })
      .catch((err) => {
        if (cancelled) return
        const status = err?.response?.status ?? err?.statusCode
        const text = String(err?.response?.data?.message ?? err?.message ?? '')
        setPairUsed(status === 404 || /not found/i.test(text) ? 0 : null)
      })
    return () => {
      cancelled = true
    }
  }, [hub.address, mode, selectedKeyForPair, sourceKeyForPair])

  /*
   * All three actions land in the same drawer. Only the intent text and the
   * broadcast call differ, so the review → sign → receipt sequence is written
   * once in TxDrawer rather than three times here.
   */
  const submit = () => {
    // Claim needs no validator or amount — it withdraws from every delegation
    // at once, so it gates and opens the tx drawer on its own.
    if (mode === 'claim') {
      if (rewardsMicro <= 0) return
      const intent = {
        title: `Claim ${lume(rewardsMicro)} LUME`,
        lineLabel: 'Rewards from',
        line: rewardValidators
          ? `${rewardValidators} validator${rewardValidators === 1 ? '' : 's'}`
          : 'your validators',
      }
      hub.gate(intent, () => hub.openDrawer({ kind: 'tx', intent }))
      return
    }
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
        : mode === 'undelegate' && unbondingLabel
          ? { extra: { k: 'Available in', v: unbondingLabel, tone: 'warn' as const } }
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

  const profileKey = hub.drawer?.kind === 'validator' ? hub.drawer.name : undefined
  const profileValidator: ValidatorDetail | undefined = useMemo(() => {
    if (!profileKey) return undefined
    const raw = (staking.activeValidators || []).find(
      (v) => v.operator_address === profileKey,
    )
    const row = validators.find((v) => v.key === profileKey)
    if (!raw || !row) return undefined
    const rates = raw.commission?.commission_rates
    return {
      operatorAddress: raw.operator_address,
      name: row.name,
      initials: row.initials,
      identity: raw.description?.identity || undefined,
      website: raw.description?.website || undefined,
      details: raw.description?.details || undefined,
      jailed: !!raw.jailed,
      power: row.power,
      tokensMicro: Number(raw.tokens) || 0,
      commission: row.commission,
      maxCommission: rates?.max_rate != null ? Number(rates.max_rate) * 100 : null,
      maxChangeRate: rates?.max_change_rate != null ? Number(rates.max_change_rate) * 100 : null,
      commissionUpdated: raw.commission?.update_time || null,
      missed: (row as ValidatorRow & { missed: number | null }).missed ?? null,
      signingWindow: signWindow || null,
      uptime: row.uptime,
      apr: row.apr,
      minSelfDelegationMicro:
        raw.min_self_delegation != null ? Number(raw.min_self_delegation) : null,
      mineMicro: row.mine,
    }
  }, [profileKey, signWindow, staking.activeValidators, validators])

  const broadcast =
    mode === 'claim'
      ? handleClaimButtonClick
      : mode === 'delegate'
        ? delegate.handleSendClick
        : mode === 'undelegate'
          ? unbond.handleSendClick
          : redelegate.handleSendClick

  // The hook that owns the Advanced block's memo/gas for the current action, so
  // an edit in the drawer reaches the broadcast. Claim withdraws from every
  // delegation with no amount, memo or gas to tune, so it has none.
  const advanced =
    mode === 'delegate'
      ? delegate
      : mode === 'undelegate'
        ? unbond
        : mode === 'redelegate'
          ? redelegate
          : null

  const txError =
    mode === 'claim'
      ? errorClaim || undefined
      : mode === 'delegate'
        ? delegate.error
        : mode === 'undelegate'
          ? unbond.error
          : redelegate.error
  const txHash =
    mode === 'claim'
      ? claimHash
      : mode === 'delegate'
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
        // The whole figure, as the design prints it; the strip has the room.
        totalBonded={
          totalBondedMicro
            ? `${Math.round(totalBondedMicro / RATE_VALUE).toLocaleString('en-US')} LUME`
            : '—'
        }
        netApr={netAprValue ? `${netAprValue.toFixed(1)}%` : '—'}
        unbondingDays={unbondingLabel ?? '—'}
        maxRedelegationEntries={chainParams.maxRedelegationEntries}
        minCommissionRate={chainParams.minCommissionRate}
        lockDate={lockDate}
        pairUsed={pairUsed}
        myStake={stakedMicro ? `${lume(stakedMicro, 0)} LUME` : '—'}
        rewards={`${lume(rewardsMicro)} LUME`}
        rewardsMicro={rewardsMicro}
        rewardValidators={rewardValidators}
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
        onOpenProfile={(key) => hub.openDrawer({ kind: 'validator', name: key })}
      />

      <ValidatorDrawer
        validator={profileValidator}
        onDelegate={(operatorAddress) => {
          setSelectedKey(operatorAddress)
          setMode('delegate')
          hub.closeDrawer()
        }}
      />

      <TxDrawer
        onBroadcast={broadcast}
        error={txError}
        transactionHash={txHash}
        memo={advanced?.optionsAdvanced.memo}
        onMemoChange={advanced ? (v) => advanced.handleInputChange('memo', v) : undefined}
        gasLimit={advanced?.optionsAdvanced.gas}
        onGasLimitChange={advanced ? (v) => advanced.handleInputChange('gas', v) : undefined}
        onDone={() => {
          setAmount('')
          fetchData()
        }}
      />
    </>
  )
}
