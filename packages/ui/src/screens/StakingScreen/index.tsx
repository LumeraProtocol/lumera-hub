import {
  YStack,
  H2,
  Paragraph,
  Card,
  H3,
} from 'tamagui';
import { Wallet } from '@tamagui/lucide-icons';
import { fromHex, toBase64 } from '@cosmjs/encoding';
import { Coins } from 'lucide-react';

import UnbondModal from '@/components/UnbondModal';
import RedelegateModal from '@/components/RedelegateModal';
import { AppLoading } from '@/components/Loading';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { RATE_VALUE } from '@/contants';
import { DelegationResponse } from '@/hooks/useAccountInfo';
import {
  TSigningInfos,
  IReward,
  IValidator,
  AccountInfoData,
  IRecentActivity,
  TUnbondingDelegation,
} from '@/types';
import { DENOM } from '@/contants/network';
import {
  formatToken,
  formatAddress,
  formatTokens,
} from '@/utils/format';
import {
  calculateTotalPower,
  valconsToBase64,
  consensusPubkeyToHexAddress,
} from '@/utils/helpers';
import { ClaimableRewardsModal } from '../HomeScreen';
import RewardsCalculator from './components/RewardsCalculator';
import StakeModal from './components/StakeModal';
import ValidatorModal from './components/ValidatorModal';
import AllValidators from './components/AllValidators';
import Staking from './components/Staking';
import Unstake from './components/Unstake';
import Activities from './components/Activities';

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
    selectedModal?: string;
    onCloseCongratulationsModal?: () => void;
    onCloseDailogChange: () => void;
    onSendClick: () => void;
    onInputChange: (name: string, value: string) => void;
    onAdvancedCheckedChange: (checked: boolean) => void;
    onOpenModal: (validator: string, customMemo?: string) => void;
    onStakingButtonClick: (amount: string) => void;
    onCloseContinueToStakingModal: () => void;
    onSelectValidator: (validator: string) => void;
    onStakingAmountChange: (amount: string) => void;
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
    rewards: IReward[];
    subTab: string;
    apr: number;
    isAPRLoading: boolean;
    bondedTokens: number;
    selectedModal: string;
    selectedData: {
      validator: string;
      amount: string;
      customMemo: string;
      rewards: string;
    };
    onSubTabChange: (tab: string) => void;
    onValidatorTabChange: (tab: string) => void;
    onTabChange: (tab: string) => void;
    handleOpenModal: (name: string) => void;
    handleCloseModal: () => void;
    handleShowConfirmModal: (
      name: string,
      validator: string,
      amount: string,
      customMemo: string,
      rewards: string,
    ) => void;
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
    handleToggleClaimItemModal: (status: boolean, item: DelegationResponse) => void;
    isClaimModalOpen: boolean;
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onClaimButtonClick: () => void;
    selectedClaim?: DelegationResponse | null;
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
  isAccountInfoLoading: boolean;
  unbondOptions: {
    isUnbondLoading: boolean;
    error: string | null;
    optionsAdvanced: {
      fees: string;
      gas: string;
      memo: string;
      senderAddress: string;
      amount: string;
      validator: string;
      validatorName: string;
    };
    showAdvanced: boolean;
    isOpenModal: boolean;
    availableAmount?: string;
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onCloseDailogChange: () => void;
    onSendClick: () => void;
    onInputChange: (name: string, value: string) => void;
    onAdvancedCheckedChange: (checked: boolean) => void;
    onOpenModal: (validator: string, amount: string, customMemo?: string) => void;
  };
  redelegateOptions: {
    isRedelegateLoading: boolean;
    error: string | null;
    optionsAdvanced: {
      fees: string;
      gas: string;
      memo: string;
      senderAddress: string;
      amount: string;
      destinationValidator: string;
      sourceValidator: string;
      validatorName: string;
    };
    showAdvanced: boolean;
    isOpenModal: boolean;
    availableAmount?: string;
    validators: IValidator[];
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onCloseDailogChange: () => void;
    onSendClick: () => void;
    onInputChange: (name: string, value: string) => void;
    onAdvancedCheckedChange: (checked: boolean) => void;
    onOpenModal: (validator: string, amount: string, customMemo?: string) => void;
  };
  onRefreshBalance: () => void;
}

export const getTotalBalances = (accountInfo: AccountInfoData | null) => {
  let total = 0;
  if (accountInfo?.balances?.length) {
    for (const item of accountInfo?.balances) {
      if (item.denom === DENOM) {
        total += Number(item.amount);
      }
      if (item.denom === 'lume') {
        total += Number(item.amount) * RATE_VALUE;
      }
    }
  }
  return total / RATE_VALUE;
}

export const StakingScreen = ({
  address,
  delegateOptions,
  staking,
  accountInfo,
  claim,
  activityData,
  unbonding,
  isAccountInfoLoading,
  unbondOptions,
  redelegateOptions,
  onRefreshBalance,
}: IStakingScreen) => {
  const getValidators = () => {
    const validators = staking?.currentTab === 'active' ? delegateOptions.validators : staking.validators;
    return validators
  }

  const getAllValidators = () => {
    return [...delegateOptions.validators, ...staking.validators];
  }

  const totalPower = calculateTotalPower(getValidators());

  const getMyTotalStaked = () => {
    if (staking.validatorTab === 'my') {
      return accountInfo?.delegations?.reduce((total, item) => Number(item.balance.amount) + total, 0) || 0;
    }
    return 0;
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

  const getReward = (reward: IReward) => {
    let total = 0;
    for (const item of reward.reward) {
      if (item.denom === 'ulume') {
        total += Number(item.amount);
      }
    }

    return total;
  }

  const getCongratulationsMessage = () => {
    if (!claim.selectedClaim) {
      return '';
    }
     const validator = getAllValidators().find(v => v.operator_address === claim.selectedClaim?.delegation.validator_address);
     if (!validator) {
      return '';
     }

     return `Congratulations! Rewards have been claimed from ${validator.description.moniker || formatAddress(validator?.operator_address || '', 10, -5)} successfully.`
  }

  const getValidatorInfo = () => {
    let amount = formatToken({
      amount: `${getTotalRewards()}`,
      denom: staking.params.bond_denom,
    }, false, '0,0.[000000]');
    let name = 'All';
    let validatorName = '';

    if (claim.selectedClaim) {
      const validator = getAllValidators().find((item) => item.operator_address === claim.selectedClaim?.delegation.validator_address)
      const reward = accountInfo?.rewards.find(v => v.validator_address === claim.selectedClaim?.delegation.validator_address);

      amount = formatTokens(reward?.reward, false, '0,0.[000000]');
      name = validator?.description?.moniker || formatAddress(validator?.operator_address || '', 10, -5) || '';
    }

    if (unbondOptions?.optionsAdvanced?.validator) {
      const validator = getAllValidators().find((item) => item.operator_address === unbondOptions?.optionsAdvanced?.validator);
      validatorName = validator?.description?.moniker || formatAddress(validator?.operator_address || '', 10, -5) || '';
    }

    return {
      amount,
      name,
      validatorName,
    }
  }
  const validatorInfo = getValidatorInfo();

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <div className='w-full'>
        <div className='w-full'>
          <ul className='flex gap-0 list-none tabs'>
            <li className={`tab-item ${staking.validatorTab === 'all' ? 'active' : ''}`}>
              <button className='tab-button cursor-pointer px-3' onClick={() => staking.onValidatorTabChange('all')}>Overview</button>
            </li>
            <li className={`tab-item ${staking.validatorTab === 'my' ? 'active' : ''}`}>
              <button className='tab-button cursor-pointer px-3' onClick={() => staking.onValidatorTabChange('my')}>My Staking</button>
            </li>
          </ul>
        </div>
        <div>
        {staking.validatorTab === 'all' ?
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 w-full gap-6 mt-6 staking-summary-wrapper relative'>
              <Card elevate size="$4" bordered className='w-full'>
                <Card.Header padded>
                  <SectionTitle className='mb-0'>Total Staked LUME</SectionTitle>
                  <div className='text-[40px] font-bold text-white !leading-11 mt-2'>
                    {staking.isLoading ?
                      <div className='relative min-h-11'>
                        <AppLoading
                          isLoading
                          className="w-10 h-10 !border-2"
                          iconWidth={20}
                          iconHeight={20}
                          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                        />
                      </div> : <>
                        {staking.bondedTokens ? formatToken({
                          amount: `${staking.bondedTokens}`,
                          denom: staking.params.bond_denom,
                        }, false, '0,0.[00]') : 0}
                      </>
                    }
                  </div>
                </Card.Header>
              </Card>
              <Card elevate size="$4" bordered className='w-full'>
                <Card.Header padded>
                  <SectionTitle className='mb-0'>Staking Rewards APR</SectionTitle>
                  <div className='!text-lumera-green font-bold text-[40px] !leading-11 mt-2'>
                    {staking.isAPRLoading ?
                      <div className='relative min-h-11'>
                        <AppLoading
                          isLoading
                          className="w-10 h-10 !border-2"
                          iconWidth={20}
                          iconHeight={20}
                          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                        />
                      </div> : <>
                        {staking.apr ? staking.apr.toFixed(2) : 0}%
                      </>
                    }
                  </div>
                </Card.Header>
              </Card>
            </div>
            <RewardsCalculator
              apr={staking.apr}
              availableAmount={getTotalBalances(accountInfo)}
              onStakingButtonClick={delegateOptions.onStakingButtonClick}
              onRefreshBalance={onRefreshBalance}
              isLoading={isAccountInfoLoading}
            />
            <AllValidators
              delegateOptions={delegateOptions}
              getUptime={getUptime}
              staking={staking}
              totalPower={totalPower}
            />
          </> :
          <div className='mt-6'>
            {!address ?
              <Card elevate size="$4" bordered className='w-full'>
                <div className='flex flex-col items-center justify-center min-h-[80vh]'>
                  <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
                    <Wallet size="$3" />
                  </div>
                  <H2 className='font-bold text-white text-[32px] leading-none !mt-5 text-center'>Connect Your Wallet</H2>
                  <Paragraph className='text-base text-lumera-gray mx-auto max-w-[400px] text-center !mt-3'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</Paragraph>
                  <div className='text-center mt-4'>
                    <ConnectWalletButton />
                  </div>
                </div>
              </Card> :
              <Card elevate size="$4" bordered className='w-full'>
                <Card.Header padded>
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 mt-6 ">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">My Staking Amount</p>
                        {staking.isLoading || isAccountInfoLoading ?
                          <div className='relative min-h-9'>
                            <AppLoading
                              isLoading
                              className="w-8 h-8 !border-3"
                              iconWidth={16}
                              iconHeight={16}
                              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-8 h-8 z-50'
                            />
                          </div> :
                          <p className="text-2xl sm:text-3xl font-bold text-white">
                            {formatToken({
                              amount: `${getMyTotalStaked()}`,
                              denom: staking.params.bond_denom,
                            }, true, '0,0.[000000]')}
                          </p>
                        }
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Claimable Rewards</p>
                          {staking.isLoading || isAccountInfoLoading ?
                            <div className='relative min-h-9'>
                              <AppLoading
                                isLoading
                                className="w-8 h-8 !border-3"
                                iconWidth={16}
                                iconHeight={16}
                                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-8 h-8 z-50'
                              />
                            </div> :
                            <p className="text-2xl sm:text-3xl font-bold text-teal-400">
                              {formatToken({
                                amount: `${getTotalRewards()}`,
                                denom: staking.params.bond_denom,
                              }, true, '0,0.[000000]')}
                            </p>
                          }
                      </div>
                    </div>
                    <AppButton
                      className="w-full md:w-auto"
                      onClick={() => claim.handleToggleClaimModal(true)}
                      disabled={staking.isLoading || isAccountInfoLoading}
                    >
                      <Coins className="w-5 h-5"/>Claim All Rewards
                    </AppButton>
                  </div>
                  <div className="mt-8 border-t border-gray-700 pt-6">
                    <div className='overflow-x-auto'>
                      <div className="flex border-b border-gray-700">
                        <button
                          onClick={() => staking.onSubTabChange('delegations')}
                          className={`px-4 py-2 font-medium cursor-pointer ${staking.subTab === 'delegations' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
                        >
                          Staking
                        </button>
                        <button
                          onClick={() => staking.onSubTabChange('unstake')}
                          className={`px-4 py-2 font-medium cursor-pointer ${staking.subTab === 'unstake' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
                        >
                          Unstake/Restake
                        </button>
                        <button
                          onClick={() => staking.onSubTabChange('activities')}
                          className={`px-4 py-2 font-medium cursor-pointer ${staking.subTab === 'activities' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
                        >
                          Activities
                        </button>
                      </div>
                    </div>
                    <div className="mt-6">
                      {staking.subTab === 'delegations' && (
                        <Staking
                          accountInfo={accountInfo}
                          allValidators={getAllValidators()}
                          claim={claim}
                          delegateOptions={delegateOptions}
                          getReward={getReward}
                          isAccountInfoLoading={isAccountInfoLoading}
                          redelegateOptions={redelegateOptions}
                          unbondOptions={unbondOptions}
                        />
                      )}

                      {staking.subTab === 'unstake' && (
                        <Unstake
                          allValidators={getAllValidators()}
                          staking={staking}
                          unbonding={unbonding}
                        />
                      )}

                      {staking.subTab === 'activities' && (
                        <Activities activityData={activityData} />
                      )}
                    </div>
                  </div>
                </Card.Header>
              </Card>
            }
          </div>
        }
      </div>
      <UnbondModal
        isOpen={unbondOptions.isOpenModal}
        isUnbondLoading={unbondOptions.isUnbondLoading}
        availableAmount={parseFloat(unbondOptions.availableAmount || '0')}
        onAdvancedCheckedChange={unbondOptions.onAdvancedCheckedChange}
        onCloseDailogChange={unbondOptions.onCloseDailogChange}
        onInputChange={unbondOptions.onInputChange}
        onSendClick={unbondOptions.onSendClick}
        optionsAdvanced={unbondOptions.optionsAdvanced}
        showAdvanced={unbondOptions.showAdvanced}
        error={unbondOptions.error}
        transactionHash={unbondOptions.transactionHash}
        onCloseCongratulationsModal={unbondOptions.onCloseCongratulationsModal}
        validatorName={validatorInfo.validatorName || ''}
      />
      <RedelegateModal
        isOpen={redelegateOptions.isOpenModal}
        isRedelegateLoading={redelegateOptions.isRedelegateLoading}
        availableAmount={parseFloat(redelegateOptions.availableAmount || '0')}
        onAdvancedCheckedChange={redelegateOptions.onAdvancedCheckedChange}
        onCloseDailogChange={redelegateOptions.onCloseDailogChange}
        onInputChange={redelegateOptions.onInputChange}
        onSendClick={redelegateOptions.onSendClick}
        optionsAdvanced={redelegateOptions.optionsAdvanced}
        showAdvanced={redelegateOptions.showAdvanced}
        error={redelegateOptions.error}
        transactionHash={redelegateOptions.transactionHash}
        onCloseCongratulationsModal={redelegateOptions.onCloseCongratulationsModal}
        validators={redelegateOptions.validators}
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
        congratulationsMessage={getCongratulationsMessage()}
        message={{
          amount: validatorInfo.amount,
          from: validatorInfo.name || '',
        }}
      />
      <ValidatorModal
        isOpen={delegateOptions.selectedModal === 'validator'}
        onClose={delegateOptions.onCloseContinueToStakingModal}
        onSelectValidator={delegateOptions.onSelectValidator}
        bond_denom={staking.params.bond_denom}
        getUptime={getUptime}
        totalPower={totalPower}
        validators={delegateOptions.validators}
      />
      <StakeModal
        isOpen={delegateOptions.selectedModal === 'stake'}
        availableAmount={getTotalBalances(accountInfo)}
        onClose={delegateOptions.onCloseContinueToStakingModal}
        onStakingAmountChange={delegateOptions.onStakingAmountChange}
        onCloseContinueToStakingModal={delegateOptions.onCloseContinueToStakingModal}
        onSendClick={delegateOptions.onSendClick}
        validators={getAllValidators()}
        validator={delegateOptions.optionsAdvanced.validator}
        amount={delegateOptions.optionsAdvanced.amount}
        transactionHash={delegateOptions.transactionHash}
        isLoading={delegateOptions.isVoteLoading}
        error={delegateOptions.error || ''}
        isAccountLoading={isAccountInfoLoading}
        onRefreshBalance={onRefreshBalance}
      />
    </div>
    </YStack>
  )
}
