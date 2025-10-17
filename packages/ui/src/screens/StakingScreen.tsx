import React from 'react'
import { YStack, H2, Paragraph, Card, SizableText, H3, Input, Label, Text, Progress, Button } from 'tamagui'
import { Wallet, Calculator, Search } from '@tamagui/lucide-icons'
import { fromHex, toBase64 } from '@cosmjs/encoding';
import { Coins, ArrowUpRight, CheckCircle, XCircle } from 'lucide-react';

import PastTime from '@/components/PastTime';
import Loading from '@/components/Loading';
import CountDown from '@/components/CountDown';
import DelegateModal from '@/components/DelegateModal';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import { AccountInfoData, Coin } from '@/hooks/useAccountInfo';
import { IRecentActivity } from '@/hooks/useRecentActivity';
import { RATE_VALUE } from '@/hooks/useDeposit';
import { IValidator } from '@/types/validator';
import { 
  formatToken, 
  formatCommissionRate, 
  formatAddress, 
  percent, 
  formatTokens,
} from '@/utils/format';
import { 
  calculateTotalPower, 
  calculatePercent, 
  valconsToBase64, 
  consensusPubkeyToHexAddress, 
  getMessages,
  mapAmount,
} from '@/utils/helpers';
import { Button as CustomButton} from './WalletScreen';
import { ClaimableRewardsModal } from './HomeScreen';

type TSigningInfos = {
  address: string;
  index_offset: string;
  jailed_until: string;
  missed_blocks_counter: string;
  start_height: string;
  tombstoned: boolean;
}

type Ireward = {
  validator_address: string;
  reward: Coin[];
}

type TEntry = {
  creation_height: string;
  completion_time: string;
  initial_balance: string;
  balance: string;
  unbonding_id: string;
  unbonding_on_hold_ref_count: string;
}

type TUnbondingDelegation = {
  delegator_address: string;
  validator_address: string;
  entries: TEntry[];
}

interface IStakingScreen {
  address: string;
  delegateOptions: {
    isVoteLoading: boolean;
    error: string | null;
    optionsAdvanced: {
        fees: string; 
        gas: string; 
        memo: string; 
        senderAddress: string; 
        amount: string; 
        validator: string; 
    };
    showAdvanced: boolean;
    validators: IValidator[];
    totalValidators: string;
    isLoading: boolean;
    isOpenModal: boolean;
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onCloseDailogChange: () => void;
    onSendClick: () => void;
    onInputChange: (name: string, value: string) => void;
    onAdvancedCheckedChange: (checked: boolean) => void;
    onOpenModal: (validator: string) => void;
  };
  staking: {
    validators: IValidator[];
    totalValidators: string;
    currentTab: string;
    isLoading: boolean;
    params: {
      bond_denom: string;
      historical_entries: number;
      max_entries: number;
      max_validators: number;
      min_commission_rate: string;
      unbonding_time: string;
    };
    slashingParams: {
      signed_blocks_window: string;
      min_signed_per_window: string;
      downtime_jail_duration: string;
      slash_fraction_double_sign: string;
      slash_fraction_downtime: string;
    };
    signingInfos: TSigningInfos[];
    validatorTab: string;
    rewards: Ireward[];
    subTab: string;
    onSubTabChange: (tab: string) => void;
    onValidatorTabChange: (tab: string) => void;
    onTabChange: (tab: string) => void;
  };
  accountInfo: AccountInfoData | null;
  claim: {
    isClaimLoading: boolean;
    claimInfo: {
      senderAddress: string; 
      fees: string; 
      gas: string; 
      memo: string; 
    };
    errorClaim: string | null;
    handleClaimChange: (name: string, value: string) => void;
    handleToggleClaimModal: (status: boolean) => void;
    isClaimModalOpen: boolean;
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onClaimButtonClick: () => void;
  };
  activityData: {
    isActivitiesLoading: boolean;
    activities: IRecentActivity[];
    activitiesError: string;
  };
  unbonding: {
    isLoading: boolean;
    unbondingDelegations: TUnbondingDelegation[];
    unbondingDelegationsError: string;
  };
}

export const StakingScreen = ({ 
  address,
  delegateOptions,
  staking,
  accountInfo,
  claim,
  activityData,
  unbonding,
}: IStakingScreen) => {
  const getValidators = () => {
    const validators = staking?.currentTab === 'active' ? delegateOptions.validators : staking.validators;
    return validators
  }

  const calcTotalValidatorByTab = (tab: string) => {
    switch (tab) {
      case "active":
        return delegateOptions?.totalValidators;
      case "inactive":
        return staking?.totalValidators;
      default:
          return "0";
    }
  }

  const getAllValidators = () => {
    return [...delegateOptions.validators, ...staking.validators];
  }

  const totalPower = calculateTotalPower(getValidators());

  const getTotalStaked = () => {
    if (staking.validatorTab === 'my') {
      return accountInfo?.delegations?.reduce((total, item) => Number(item.delegation.shares) + total, 0) || 0;
    }
    return calculateTotalPower(getAllValidators());
  }

  const getValidatorsBySort = () => {
    const validators = getValidators();

    return validators.sort((a, b) => Number(calculatePercent(b.delegator_shares, totalPower).replace('%', '')) - Number(calculatePercent(a.delegator_shares, totalPower).replace('%', '')));
  }

  const getTotalBalances = () => {
    let total = 0;
    if (accountInfo?.balances?.length) {
      for (const item of accountInfo?.balances) {
        if (item.denom === 'ulume') {
          total += Number(item.amount);
        }
      }
    }
    if (accountInfo?.delegations?.length) {
      for (const item of accountInfo?.delegations) {
        if (item.balance.denom === 'ulume') {
          total += Number(item.balance.amount);
        }
      }
    }
    return total / RATE_VALUE;
  }

  const getUptime = (validator: IValidator) => {
    const slashingParams = staking.slashingParams;
    const signingInfos = staking.signingInfos;
    const hex = consensusPubkeyToHexAddress(validator.consensus_pubkey);
    const window = Number(slashingParams.signed_blocks_window || 0);
    const signing = signingInfos.find((item) => {
      return toBase64(fromHex(hex)) === valconsToBase64(item.address)
    });
    return signing && window > 0
      ? (window - Number(signing.missed_blocks_counter)) / window
      : 0
  }

  const getTotalRewards = () => {
    let total = 0;
    if (accountInfo?.rewards?.length) {
      for (const item of accountInfo?.rewards) {
        for (const reward of item.reward) {
          if (reward.denom === staking.params.bond_denom) {
            total += Number(reward.amount);
          }
        }
      }
    }
    return total;
  }

  const getReward = (reward: Ireward) => {
    let total = 0;
    for (const item of reward.reward) {
      if (item.denom === 'ulume') {
        total += Number(item.amount);
      }
    }

    return total;
  }

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      {!address ?
        <Card elevate size="$4" bordered className='w-full'>
          <div className='flex flex-col items-center justify-center min-h-[80vh]'>
            <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
              <Wallet size="$3" />
            </div>
            <H2 className='font-bold text-white text-[32px] leading-none !mt-5'>Connect Your Wallet</H2>
            <Paragraph className='text-base text-lumera-gray mx-auto max-w-[400px] text-center !mt-3'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</Paragraph>
            <div className='text-center mt-4'>
              <ConnectWalletButton />
            </div>
          </div>
        </Card> :
        <div className='w-full'>
          <div className='w-full'>
            <ul className='flex gap-0 list-none tabs'>
              <li className={`tab-item ${staking.validatorTab === 'all' ? 'active' : ''}`}>
                <button className='tab-button cursor-pointer px-3' onClick={() => staking.onValidatorTabChange('all')}>All Validators</button>
              </li>
              <li className={`tab-item ${staking.validatorTab === 'my' ? 'active' : ''}`}>
                <button className='tab-button cursor-pointer px-3' onClick={() => staking.onValidatorTabChange('my')}>My Staking</button>
              </li>
            </ul>
          </div>
          <div>
          {staking.validatorTab === 'all' ?
            <>
              <div className='flex justify-between w-full gap-6 mt-6 staking-summary-wrapper relative'>
                <Loading isLoading={staking.isLoading || delegateOptions.isLoading} />
                <Card elevate size="$4" bordered className='w-2/3'>
                  <Card.Header padded>
                    <H3 className='text-lumera-label'>Total LUME Staked</H3>
                    <div className='text-[40px] font-bold text-white'>
                      {formatToken({
                        amount: `${getTotalStaked()}`,
                        denom: staking.params.bond_denom,
                      }, true, '0,0.[00]')}
                    </div>
                  </Card.Header>
                </Card>
                <Card elevate size="$4" bordered className='current-staking-apr'>
                  <Card.Header padded>
                    <H3 className='text-lumera-label'>Current Staking APR</H3>
                    <div className='!text-lumera-green font-bold text-[40px]'>
                      Coming soon
                    </div>
                  </Card.Header>
                </Card>
              </div>
              <Card elevate size="$4" bordered className='w-full mt-6'>
                <Card.Header padded>
                  <div className='grid grid-cols-2 gap-6 w-full rewards-calculator-wrapper'>
                    <div className='w-full'>
                      <H3 className='!flex gap-2 items-center rewards-calculator-icon'><Calculator /> <span>Rewards Calculator</span></H3>
                      <Text className='text-lumera-label text-base'>Estimate your potential earnings from staking LUME.</Text>
                      <div className='mt-5'>
                        <Label htmlFor="amount" className='text-base'>Amount to Stake</Label>
                        <div className='input-wrapper'>
                          <Input id="amount" placeholder="0.00" className='input has-symbol' />
                          <span className='input-symbol'>LUME</span>
                        </div>
                      </div>
                    </div>
                    <Card elevate size="$4" bordered className='w-full estimated-rewards-card'>
                      <Card.Header padded>
                        <H3>Estimated Rewards</H3>
                        <div className='mt-3 grid grid-cols-2 gap-2'>
                          <div className='flex flex-col'>
                            <SizableText className='text-lumera-label'>1 Day</SizableText>
                            <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                          </div>
                          <div className='flex flex-col'>
                            <SizableText className='text-lumera-label'>7 Days</SizableText>
                            <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                          </div>
                          <div className='flex flex-col'>
                            <SizableText className='text-lumera-label'>30 Days</SizableText>
                            <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                          </div>
                          <div className='flex flex-col'>
                            <SizableText className='text-lumera-label'>365 Days</SizableText>
                            <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                          </div>
                        </div>
                        <div className='!mt-3 text-lumera-label text-sm'>* All calculations are estimates based on the current APR and are subject to change.</div>
                      </Card.Header>
                    </Card>
                  </div>
                </Card.Header>
              </Card>
              <Card elevate size="$4" bordered className='w-full mt-6'>
                <Card.Header padded>
                  <div className='flex justify-between w-full validators-control'>
                    <div className='flex flex-col'>
                      <H3 className='leading-none'>All Validators</H3>
                      <SizableText className='text-lumera-label'>Delegate your stake to a validator to earn rewards.</SizableText>
                    </div>
                    <div className='hidden'>
                      <div className='input-wrapper'>
                        <Input id="amount" placeholder="Search validator" className='input has-symbol' />
                        <span className='input-symbol'>
                          <Search />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='mt-5 relative'>
                    <Loading isLoading={staking.isLoading || delegateOptions.isLoading} />
                    <ul className='flex gap-0 list-none tabs'>
                      <li className={`tab-item ${staking?.currentTab === 'active' ? 'active' : ''}`}>
                        <button className='tab-button cursor-pointer px-3' onClick={() => staking.onTabChange('active')}>Active ({calcTotalValidatorByTab('active')})</button>
                      </li>
                      <li className={`tab-item ${staking?.currentTab === 'inactive' ? 'active' : ''}`}>
                        <button className='tab-button cursor-pointer px-3' onClick={() => staking.onTabChange('inactive')}>Inactive ({calcTotalValidatorByTab('inactive')})</button>
                      </li>
                    </ul>
                    <table className='w-full table mt-5 staking-table'>
                      <thead>
                        <tr>
                          <th align='left' className='text-lumera-label validator'>Validator</th>
                          <th align='right' className='text-lumera-label staked-amount'>Staked Amount</th>
                          <th align='right' className='text-lumera-label commission'>Commission</th>
                          <th align='right' className='text-lumera-label voting-power'>Voting Power</th>
                          <th align='left' className='text-lumera-label uptime'>Uptime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getValidatorsBySort()?.map((validator) => {
                          const uptime = getUptime(validator);
                          const uptimePercent = percent(uptime);
                          return (
                            <tr key={validator.operator_address}>
                              <td data-label="Validator: ">
                                {validator.description.moniker}
                              </td>
                              <td data-label="Staked Amount: " align='right'>{formatToken({
                                amount: validator.tokens,
                                denom: staking.params.bond_denom,
                              }, true, '0,0')}</td>
                              <td data-label="Commission: " align='right'><Text>{formatCommissionRate(validator.commission?.commission_rates?.rate)}</Text></td>
                              <td data-label="Voting Power: " align='right'><Text>{calculatePercent(validator.delegator_shares, totalPower)}</Text></td>
                              <td data-label="Uptime: ">
                                <div className='flex w-full justify-between items-center gap-3 action-col'>
                                  <div className='flex items-center gap-3'>
                                    <div className='custom-progress'>
                                      <Progress size="$4" value={Number(uptimePercent.replace('%', ''))}>
                                        <Progress.Indicator animation="bouncy" />
                                      </Progress>
                                    </div>
                                    <Text className={uptime && uptime > 0.95 ? 'text-green-500' : 'text-red-500'}>{uptimePercent}</Text>
                                  </div>
                                  <div className='btn-secondary'>
                                    <Button onPress={() => delegateOptions.onOpenModal(validator.operator_address)}>Delegate</Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card.Header>
              </Card>
            </> :
            <div className='mt-6'>
              <Card elevate size="$4" bordered className='w-full'>
                <Card.Header padded>
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 mt-6 ">
                      <div>
                        <p className="text-sm text-gray-400">Total Staked</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white">
                          {formatToken({
                            amount: `${getTotalStaked()}`,
                            denom: staking.params.bond_denom,
                          }, true, '0,0.[000000]')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Staking Value</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white">$ TBD</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Claimable Rewards</p>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-400">
                          {formatToken({
                            amount: `${getTotalRewards()}`,
                            denom: staking.params.bond_denom,
                          }, true, '0,0.[000000]')}
                        </p>
                      </div>
                    </div>
                    <CustomButton className="w-full md:w-auto" onClick={() => claim.handleToggleClaimModal(true)}>
                      <Coins className="w-5 h-5"/>Claim All Rewards
                    </CustomButton>
                  </div>
                  <div className="mt-8 border-t border-gray-700 pt-6">
                    <div className="flex border-b border-gray-700">
                      <button 
                        onClick={() => staking.onSubTabChange('delegations')} 
                        className={`px-4 py-2 font-medium ${staking.subTab === 'delegations' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                      >
                        Delegations
                      </button>
                      <button 
                        onClick={() => staking.onSubTabChange('unstake')} 
                        className={`px-4 py-2 font-medium ${staking.subTab === 'unstake' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                      >
                        Unstake/Restake
                      </button>
                      <button 
                        onClick={() => staking.onSubTabChange('activities')} 
                        className={`px-4 py-2 font-medium ${staking.subTab === 'activities' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                      >
                        Activities
                      </button>
                    </div>
                    <div className="mt-6">
                      {staking.subTab === 'delegations' && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[700px] space-y-2">
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                              <div className="col-span-4">Validator</div>
                              <div className="col-span-3 text-right">Staked</div>
                              <div className="col-span-3 text-right">Claimable</div>
                              <div className="col-span-2"></div>
                            </div>
                            {accountInfo?.delegations.map(delegation => {
                              const validator = getAllValidators().find(v => v.operator_address === delegation.delegation.validator_address);
                              const reward = accountInfo?.rewards.find(v => v.validator_address === delegation.delegation.validator_address);

                              return (
                                <div 
                                  key={delegation.delegation.validator_address} 
                                  className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg"
                                >
                                  <div 
                                    className="col-span-4"
                                  >
                                    <a 
                                      href={`/staking/${delegation.delegation.validator_address}`} 
                                      className="font-semibold text-white hover:text-indigo-400 cursor-pointer"
                                    >
                                      {validator?.description?.moniker}
                                    </a>
                                  </div>
                                  <div className="col-span-3 text-right font-mono text-white">
                                      {formatToken({
                                        amount: delegation.balance.amount,
                                        denom: delegation.balance.denom,
                                      }, true, '0,0.[000000]')}
                                  </div>
                                  <div className="col-span-3 text-right font-mono text-teal-400">
                                    {formatTokens(reward?.reward)}
                                  </div>
                                  <div className="col-span-2 flex justify-end">
                                      {reward && getReward(reward) > 0 && <CustomButton variant="secondary" className="!py-1.5 !px-4 text-sm" onClick={() => claim.handleToggleClaimModal(true)}>Claim</CustomButton>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {staking.subTab === 'unstake' && (
                        <div className='relative'>
                          <Loading isLoading={unbonding.isLoading} />
                          <div className="overflow-x-auto">
                            <div className="min-w-[700px] space-y-2">
                              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                                <div className="col-span-3">Validator</div>
                                <div className="col-span-2 text-right">Initial balance</div>
                                <div className="col-span-2 text-right">Balance</div>
                                <div className="col-span-5 text-right">Completion Time</div>
                              </div>
                              {!unbonding.unbondingDelegations.length ? (
                                <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
                                  <div className='col-span-12'>
                                    <H3>No data</H3>
                                  </div>
                                </div>
                              ) : null}
                              {unbonding.unbondingDelegations.map((delegation, i) => {
                                const validator = getAllValidators().find(v => v.operator_address === delegation.validator_address);

                                return (
                                  <div key={`${delegation.delegator_address}-${delegation.validator_address}`} className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg">
                                    <div className="col-span-3 font-semibold text-white hover:text-indigo-400 cursor-pointer">
                                      {validator?.description?.moniker || formatAddress(delegation.validator_address, 12, -6)}
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-white">
                                      {formatToken({
                                        amount: delegation.entries[0].initial_balance,
                                        denom: staking.params.bond_denom,
                                      }, true, '0,0.[00]')}
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-white">
                                      {formatToken({
                                        amount: delegation.entries[0].balance,
                                        denom: staking.params.bond_denom,
                                      }, true, '0,0.[00]')}
                                    </div>
                                    <div className="col-span-5 text-right font-mono text-gray-300">
                                        <CountDown targetDate={new Date(delegation.entries[0].completion_time)} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {staking.subTab === 'activities' && (
                        <div className='relative'>
                          <Loading isLoading={activityData.isActivitiesLoading} />
                          <div className="overflow-x-auto">
                            <div className="min-w-[750px] space-y-2">
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                                    <div className="col-span-1">Block</div>
                                    <div className="col-span-3">TX Hash</div>
                                    <div className="col-span-3">Messages</div>
                                    <div className="col-span-2 text-right">Amount</div>
                                    <div className="col-span-3 text-right">Time</div>
                                </div>
                                {!activityData.activities.length ? (
                                  <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
                                    <div className='col-span-12'>
                                      <H3>No data</H3>
                                    </div>
                                  </div>
                                ) : null}
                                {activityData.activities.map((tx) => (
                                    <div key={tx.txhash} className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg text-sm">
                                        <div className="col-span-1 text-gray-300">
                                          <a 
                                            href={`/block/${tx.height}`} 
                                            className="hover:underline truncate flex items-center gap-1.5"
                                          >
                                            {tx.height}<ArrowUpRight className="w-3 h-3"/>
                                          </a>
                                        </div>
                                        <div className="col-span-3">
                                          <a 
                                            href={`/tx/${tx.txhash}`} 
                                            className="hover:underline truncate flex items-center gap-1.5"
                                          >
                                            {formatAddress(tx.txhash, 12, -6)}<ArrowUpRight className="w-3 h-3"/>
                                          </a>
                                        </div>
                                        <div className="col-span-3 font-medium text-white">
                                          {getMessages(tx.tx.body.messages)}
                                        </div>
                                        <div className="col-span-2 text-right text-white">
                                          {mapAmount(tx.events)?.join(", ")}
                                        </div>
                                        <div className="col-span-3 text-gray-400 flex justify-end">
                                          {tx.timestamp}
                                          (<PastTime pastDate={new Date(tx.timestamp)} className='text-sm' />)
                                        </div>
                                    </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card.Header>
              </Card>
            </div>
          }
        </div>
        <DelegateModal
          isOpen={delegateOptions.isOpenModal}
          availableAmount={getTotalBalances()}
          isVoteLoading={delegateOptions.isVoteLoading}
          onAdvancedCheckedChange={delegateOptions.onAdvancedCheckedChange}
          onCloseDailogChange={delegateOptions.onCloseDailogChange}
          onInputChange={delegateOptions.onInputChange}
          onSendClick={delegateOptions.onSendClick}
          optionsAdvanced={delegateOptions.optionsAdvanced}
          showAdvanced={delegateOptions.showAdvanced}
          error={delegateOptions.error}
          validators={delegateOptions.validators}
          transactionHash={delegateOptions.transactionHash}
          onCloseCongratulationsModal={delegateOptions.onCloseCongratulationsModal}
        />
        <ClaimableRewardsModal 
          isOpen={claim.isClaimModalOpen} 
          setOpen={claim.handleToggleClaimModal} 
          sender={claim.claimInfo.senderAddress} 
          onSendClick={claim.onClaimButtonClick} 
          isVoteLoading={claim.isClaimLoading} 
          error={claim.errorClaim} 
          voteAdvanced={claim.claimInfo}
          handleVoteAdvancedChange={claim.handleClaimChange}
          transactionHash={claim.transactionHash}
          onCloseCongratulationsModal={claim.onCloseCongratulationsModal}
        />
      </div>
      }
    </YStack>
  )
}
