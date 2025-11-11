import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  YStack,
  H2,
  Paragraph,
  Card,
  SizableText,
  H3,
  Input,
  Label,
  Text,
  Progress,
  Button,
  Dialog,
  VisuallyHidden,
  Checkbox,
} from 'tamagui';
import { Wallet, Calculator, Search, CircleX, Check as CheckIcon } from '@tamagui/lucide-icons';
import { fromHex, toBase64 } from '@cosmjs/encoding';
import {
  Coins,
  ArrowUpRight,
  ChevronRight,
  Check as CheckCircle,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
} from 'lucide-react';

import AppLink from '@/components/AppLink';
import PastTime from '@/components/PastTime';
import Loading from '@/components/Loading';
import CountDown from '@/components/CountDown';
import UnbondModal from '@/components/UnbondModal';
import RedelegateModal from '@/components/RedelegateModal';
import Skeleton from '@/components/Skeleton';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import AppButton from '@/components/AppButton';
import useAppRouter from '@/hooks/useAppRouter';
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
  formatCommissionRate,
  formatAddress,
  percent,
  formatTokens,
  formatNumber,
  formatTokenDisplay,
} from '@/utils/format';
import {
  calculateTotalPower,
  calculatePercent,
  valconsToBase64,
  consensusPubkeyToHexAddress,
  getMessages,
  mapAmount,
} from '@/utils/helpers';
import { ClaimableRewardsModal } from './HomeScreen';

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

interface IRewardsCalculator {
  apr: number;
  availableAmount: number;
  isLoading: boolean;
  onStakingButtonClick: (amount: string) => void;
  onRefreshBalance: () => void;
}

interface IValidatorModal {
  onClose: () => void;
  isOpen: boolean;
  bond_denom: string;
  validators: IValidator[];
  totalPower: number;
  getUptime: (validator: IValidator) => number;
  onSelectValidator: (validator: string) => void;
}

interface IStakeModal {
  isOpen: boolean;
  isLoading: boolean;
  availableAmount: number;
  validators: IValidator[];
  validator: string;
  amount: string;
  error: string;
  transactionHash?: string;
  isAccountLoading: boolean;
  onRefreshBalance: () => void;
  onClose: () => void;
  onSendClick: () => void;
  onCloseContinueToStakingModal: () => void;
  onStakingAmountChange: (amount: string) => void;
}

interface IAllValidators {
  staking: {
    isLoading: boolean;
    params: {
      bond_denom: string;
      historical_entries: number;
      max_entries: number;
      max_validators: number;
      min_commission_rate: string;
      unbonding_time: string;
    };
    currentTab: string;
    onTabChange: (tab: string) => void;
    validators: IValidator[];
  }
  totalPower: number;
  getUptime: (validator: IValidator) => number;
  delegateOptions: {
    onOpenModal: (validator: string, customMemo?: string) => void;
    validators: IValidator[];
    onSelectValidator: (validator: string) => void;
  }
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

export const StakeModal = ({
  isOpen,
  availableAmount,
  validators,
  validator,
  amount,
  transactionHash,
  isLoading,
  error,
  isAccountLoading,
  onRefreshBalance,
  onClose,
  onStakingAmountChange,
  onSendClick,
  onCloseContinueToStakingModal,
}: IStakeModal) => {
  const info = validators.find((item) => item.operator_address === validator);
  const [isYes, setYes] = React.useState(false);

  const handleAdvancedCheckedChange = (checked: boolean) => {
    setYes(checked);
  }

  if (transactionHash) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={onCloseContinueToStakingModal}
        modal
      >
        <Dialog.Trigger asChild>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            x={0}
            scale={1}
            opacity={1}
            y={0}
          >
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <div className='withdraw-main-content relative p-5'>
              <div className='flex justify-between items-center mb-4'>
                <H3 className='text-lumera-label text-[32px]'>Stake {info?.description?.moniker}</H3>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseContinueToStakingModal}><CircleX /></button>
              </div>
              <div className='mt-2 text-center'>
                <div className='flex justify-center'>
                  <CheckCircle className='w-12 h-12 text-lumera-green border border-lumera-green rounded-full p-3' />
                </div>
                <div className='mt-5 text-2xl'>Staked Successfully</div>
                <div className='mt-1'>You have staked {amount} Lume</div>
                <div className='mt-5'>
                  <AppLink
                    href={`/tx/${transactionHash}`}
                    className='text-lumera-teal hover:text-lumera-green text-sm'
                  >
                    View Transaction
                  </AppLink>
                </div>
                <div className='mt-2'>
                  <button
                    className='cursor-pointer bg-lumera-teal hover:bg-lumera-green text-white rounded-[9px] px-4 py-2'
                    onClick={onCloseContinueToStakingModal}
                  >
                    Back to Staking
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className='withdraw-main-content relative p-5'>
            <Loading isLoading={isLoading} />
            <div className='flex justify-between items-center mb-4'>
              <H3 className='text-lumera-label text-[32px]'>Stake LUME</H3>
              <button className='btn-close-modal cursor-pointer' onClick={onClose}><CircleX /></button>
            </div>
            <div className='mt-5 relative'>
              {info?.description?.moniker ?
                <div className='mb-1 flex gap-2 justify-between flex-nowrap sm:flex-wrap'>
                  <span>Selected Validator</span><span className='font-bold'>{info?.description?.moniker}</span>
                </div> : null
              }
              <div className='flex justify-between items-center gap-3'>
                <Label htmlFor="amount" className='text-base !font-semibold'>
                  Amount
                </Label>
                {availableAmount ?
                  <div className='text-sm font-normal flex gap-2 items-center'>
                    {isAccountLoading ?
                      <Skeleton /> :
                      <>
                        <button type="button" onClick={onRefreshBalance} className='cursor-pointer'>
                          <RefreshCcw className='w-4 h-4' />
                        </button>
                        <span>Available: {formatTokenDisplay({
                          amount: `${availableAmount * RATE_VALUE}`,
                          denom: DENOM,
                        })}</span>
                        <button
                          type='button'
                          className='bg-lumera-teal rounded-[9px] text-white py-0.5 px-2 text-[12px] cursor-pointer'
                          onClick={() => onStakingAmountChange(`${availableAmount}`)}
                        >
                          MAX
                        </button>
                      </>
                    }
                  </div> : null
                }
              </div>
              <div className='input-wrapper'>
                <Input
                  id="amount"
                  placeholder="0.00"
                  className='input has-symbol'
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={onStakingAmountChange}
                />
                <span className='input-symbol'>LUME</span>
              </div>
              <div className='flex gap-3 items-start mt-5'>
                <Checkbox
                  id="termOfUse"
                  size="$4"
                  checked={isYes}
                  onCheckedChange={handleAdvancedCheckedChange}
                >
                  <Checkbox.Indicator>
                    <CheckIcon />
                  </Checkbox.Indicator>
                </Checkbox>

                <Label size="$4" htmlFor="termOfUse" className='!leading-[20px]'>
                  I understand that unstaking will take 21 days for LUME to become liquid upon withdrawal.
                </Label>
              </div>
              <div className={`${!isYes ? 'btn-secondary' : 'btn-primary'} mt-8 full`}>
                <Button onPress={onSendClick} disabled={!isYes}>
                  <span className='font-bold'>Stake</span>
                </Button>
              </div>
              {error && !isLoading ?
                <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
              }
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export const ValidatorModal = ({
  isOpen,
  bond_denom,
  validators,
  totalPower,
  getUptime,
  onClose,
  onSelectValidator,
}: IValidatorModal) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className='withdraw-main-content relative p-5'>
            <div className='flex justify-between items-center mb-4'>
              <H3 className='text-lumera-label text-[32px]'>Select a Validator</H3>
              <button className='btn-close-modal cursor-pointer' onClick={onClose}><CircleX /></button>
            </div>
            <div className='max-h-[80vh] overflow-auto !min-w-[950px]'>
              <table className='w-full table staking-table'>
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
                  {validators?.map((validator, index) => {
                    const uptime = getUptime(validator);
                    const uptimePercent = percent(uptime);
                    return (
                      <tr
                        key={validator.operator_address}
                        className={`cursor-pointer ${index % 2 === 0 ? '!bg-gray-900' : ''}`}
                        onClick={() => onSelectValidator(validator.operator_address)}
                      >
                        <td data-label="Validator: ">
                          {validator.description.moniker}
                        </td>
                        <td data-label="Staked Amount: " align='right'>
                          {formatToken({
                            amount: validator.tokens,
                            denom: bond_denom,
                          }, true, '0,0')}
                        </td>
                        <td data-label="Commission: " align='right'>
                          <Text>{formatCommissionRate(validator.commission?.commission_rates?.rate)}</Text>
                        </td>
                        <td data-label="Voting Power: " align='right'><Text>{calculatePercent(validator.delegator_shares, totalPower)}</Text></td>
                        <td data-label="Uptime: ">
                          <div className='flex justify-between items-center'>
                            <Text className={uptime && uptime > 0.95 ? 'text-green-500' : 'text-red-500'}>{uptimePercent}</Text>
                            <button className='rounded-full p-2 hover:bg-lumera-sub-label cursor-pointer transition-all duration-300'><ChevronRight className='w-5 h-5' /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

const RewardsCalculator = ({
  apr,
  availableAmount,
  isLoading,
  onStakingButtonClick,
  onRefreshBalance,
}: IRewardsCalculator) => {
  const [amount, setAmount] = React.useState('0');
  const [error, setError] = React.useState('');
  const [estimatedRewards, setEstimatedRewards] = React.useState(0);

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9.]/g, '');
    const parts = numericText.split('.');
    let amount = 0;
    if (parts.length > 2) {
      const filteredText = parts[0] + '.' + parts.slice(1).join('');
      setAmount(filteredText);
      amount = Number(filteredText);
    } else {
      setAmount(numericText);
      amount = Number(numericText);
    }
    const t = 1;
    const result = amount * (apr / 100) * (t / 365);
    setEstimatedRewards(result);
  }

  const handleStakingClick = () => {
    setError('');
    if (!Number(amount)) {
      setError('Please enter amount.');
      return
    }
    if (Number(amount) <= 0) {
      setError('Amount must not be less than 0.');
      return
    }
    if (Number(amount) > Number(availableAmount)) {
      setError('Amount cannot exceed the available balance.');
      return
    }
    onStakingButtonClick(`${amount}`);
  }

  return (
    <Card elevate size="$4" bordered className='w-full mt-6'>
      <Card.Header padded>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full rewards-calculator-wrapper'>
          <div className='w-full'>
            <H3 className='!flex gap-2 items-center rewards-calculator-icon'><Calculator /> <span>Stake LUME</span></H3>
            <Text className='text-lumera-label text-base'>Estimate your potential rewards based on current network APR</Text>
            <div className='mt-5'>
              <div className='flex justify-between items-center gap-3'>
                <Label htmlFor="amount" className='text-base !font-semibold'>
                  Amount
                </Label>
                {availableAmount ?
                  <div className='text-sm font-normal flex gap-2 items-center'>
                    {isLoading ?
                      <Skeleton /> :
                      <>
                        <button type="button" onClick={onRefreshBalance} className='cursor-pointer'>
                          <RefreshCcw className='w-4 h-4' />
                        </button>
                        <span>Available: {formatTokenDisplay({
                          amount: `${availableAmount * RATE_VALUE}`,
                          denom: DENOM,
                        })}</span>
                        <button
                          type='button'
                          className='bg-lumera-teal rounded-[9px] text-white py-0.5 px-2 text-[12px] cursor-pointer'
                          onClick={() => handleAmountChange(`${availableAmount}`)}
                        >
                          MAX
                        </button>
                      </>
                    }
                  </div> : null
                }
              </div>
              <div className='input-wrapper'>
                <Input
                  id="amount"
                  placeholder="0.00"
                  className='input has-symbol'
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                />
                <span className='input-symbol'>LUME</span>
              </div>
              {error ?
                <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
              }
              <div className={`${!amount || amount === '0' ? 'btn-secondary' : 'btn-primary'} mt-5`}>
                <Button onPress={handleStakingClick} disabled={!amount || amount === '0'}>
                  <span className='font-bold'>Continue to Staking</span>
                </Button>
              </div>
            </div>
          </div>
          <Card elevate size="$4" bordered className='w-full estimated-rewards-card'>
            <Card.Header padded>
              <H3>Estimated Staking Rewards</H3>
              <div className='mt-3 grid grid-cols-2 gap-2 estimated-rewards-results'>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>1 Day</SizableText>
                  <Text className='!text-lumera-green'><span className='font-bold text-base'>{estimatedRewards.toFixed(2)}</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                </div>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>7 Days</SizableText>
                  <Text className='!text-lumera-green'><span className='font-bold text-base'>{(estimatedRewards * 7).toFixed(2)}</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                </div>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>30 Days</SizableText>
                  <Text className='!text-lumera-green'><span className='font-bold text-base'>{(estimatedRewards * 30).toFixed(2)}</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                </div>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>365 Days</SizableText>
                  <Text className='!text-lumera-green'><span className='font-bold text-base'>{(estimatedRewards * 365).toFixed(2)}</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                </div>
              </div>
              <div className='!mt-3 text-lumera-label text-sm'>* All calculations are estimates based on the current APR and are subject to change.</div>
            </Card.Header>
          </Card>
        </div>
      </Card.Header>
    </Card>
  );
}

const AllValidators = ({
  staking,
  totalPower,
  delegateOptions,
  getUptime,
}: IAllValidators) => {
  const { redirect } = useAppRouter();
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('uptime');
  const [sort, setSort] = useState('DESC');

  useEffect(() => {
    setSortBy('uptime');
    setSort('DESC');
  }, [staking?.currentTab]);


  const sortFunc = (a: IValidator, b: IValidator) => {
    switch (sortBy) {
      case 'name':
        if (sort === 'DESC') {
          return b.description.moniker.toLowerCase().localeCompare(a.description.moniker.toLowerCase());
        }
        return a.description.moniker.toLowerCase().localeCompare(b.description.moniker.toLowerCase());
      case 'amount':
        if (sort === 'DESC') {
          return Number(b.tokens) - Number(a.tokens);
        }
        return Number(a.tokens) - Number(b.tokens);
      case 'commission':
        if (sort === 'DESC') {
          return Number(formatCommissionRate(b.commission?.commission_rates?.rate).replace('%', '')) - Number(formatCommissionRate(a.commission?.commission_rates?.rate).replace('%', ''));
        }
        return Number(formatCommissionRate(a.commission?.commission_rates?.rate).replace('%', '')) - Number(formatCommissionRate(b.commission?.commission_rates?.rate).replace('%', ''));
      case 'uptime':
        if (sort === 'DESC') {
          return getUptime(b) - getUptime(a);
        }
        return getUptime(a) - getUptime(b);
      default:
        if (sort === 'DESC') {
          return Number(calculatePercent(b.delegator_shares, totalPower).replace('%', '')) - Number(calculatePercent(a.delegator_shares, totalPower).replace('%', ''));
        }
        return Number(calculatePercent(a.delegator_shares, totalPower).replace('%', '')) - Number(calculatePercent(b.delegator_shares, totalPower).replace('%', ''));
    }
  }

  const getValidators = () => {
    let validators = staking?.currentTab === 'active' ? delegateOptions.validators : staking.validators;

    if (keyword) {
      validators = validators.filter((validator) => validator.description.moniker.toLowerCase().indexOf(keyword.toLowerCase()) !== -1);
    }
    return [...validators.sort((a, b) => sortFunc(a, b))];
  }

  const handleInputChange = (text: string) => {
    setKeyword(text);
  }

  const calcTotalValidatorByTab = (tab: string) => {
    if (tab === 'active') {
      let activeValidators = delegateOptions.validators;
      if (keyword && staking?.currentTab === 'active') {
        activeValidators = activeValidators.filter((validator) => validator.description.moniker.toLowerCase().indexOf(keyword.toLowerCase()) !== -1);
      }
      return activeValidators.length;
    }

    let inactiveValidators = staking.validators;
    if (keyword && staking?.currentTab === 'inactive') {
      inactiveValidators = inactiveValidators.filter((validator) => validator.description.moniker.toLowerCase().indexOf(keyword.toLowerCase()) !== -1);
    }
    return inactiveValidators.length;
  }

  const handleSort = (name: string) => {
    const newSort = name === sortBy ? sort === 'DESC' ? 'ASC' : 'DESC' : 'DESC'
    setSort(newSort);
    setSortBy(name);
  }

  const renderSortIcon = (name: string) => {
    if (sortBy !== name) {
      return null
    }

    if (sort === 'DESC') {
      return <ArrowDown className='w-5 h-5' />
    }

    return <ArrowUp className='w-5 h-5' />
  }

  const handleValidatorClick = (operator_address: string) => {
    redirect(`/staking/${operator_address}`);
  }

  return (
    <Card elevate size="$4" bordered className='w-full mt-6'>
      <Card.Header padded>
        <div className='flex justify-between flex-col md:flex-row gap-4 w-full validators-control'>
          <div className='flex flex-col'>
            <H3 className='leading-none'>All Validators</H3>
            <SizableText className='text-lumera-label'>Delegate your stake to a validator to earn rewards.</SizableText>
          </div>
          <div className='w-80'>
            <div className='input-wrapper'>
              <Input id="amount" placeholder="Search validator" className='input has-symbol' value={keyword} onChangeText={handleInputChange} />
              <span className='input-symbol'>
                <Search />
              </span>
            </div>
          </div>
        </div>
        <div className='mt-5 relative'>
          {staking.isLoading || !staking?.params?.bond_denom ? (
              <div className='my-2 min-h-11'>
                <Loading isLoading />
              </div>
            ) : (
              <>
                <ul className='flex gap-0 list-none tabs'>
                  <li className={`tab-item ${staking?.currentTab === 'active' ? 'active' : ''}`}>
                    <button className='tab-button cursor-pointer px-3' onClick={() => staking.onTabChange('active')}>Active ({calcTotalValidatorByTab('active')})</button>
                  </li>
                  <li className={`tab-item ${staking?.currentTab === 'inactive' ? 'active' : ''}`}>
                    <button className='tab-button cursor-pointer px-3' onClick={() => staking.onTabChange('inactive')}>Inactive ({calcTotalValidatorByTab('inactive')})</button>
                  </li>
                </ul>
                <div className='overflow-x-auto'>
                  <table className='w-full table mt-5'>
                    <thead>
                      <tr>
                        <th align='left' className='text-lumera-label validator'>
                          <button
                            type="button"
                            onClick={() => handleSort('name')}
                            className='cursor-pointer flex items-center gap-1 whitespace-nowrap'
                          >
                            Validator
                            {renderSortIcon('name')}
                          </button>
                        </th>
                        <th align='right' className='text-lumera-label staked-amount'>
                          <button
                            type="button"
                            onClick={() => handleSort('amount')}
                            className='cursor-pointer flex items-center gap-1 whitespace-nowrap'
                          >
                            Staked Amount
                            {renderSortIcon('amount')}
                          </button>
                        </th>
                        <th align='right' className='text-lumera-label commission'>
                          <button
                            type="button"
                            onClick={() => handleSort('commission')}
                            className='cursor-pointer flex items-center gap-1 whitespace-nowrap'
                          >
                            Commission
                            {renderSortIcon('commission')}
                          </button>
                        </th>
                        <th align='right' className='text-lumera-label voting-power'>
                          <button
                            type="button"
                            onClick={() => handleSort('power')}
                            className='cursor-pointer flex items-center gap-1 whitespace-nowrap'
                          >
                            Voting Power
                            {renderSortIcon('power')}
                          </button>
                        </th>
                        <th align='left' className='text-lumera-label uptime'>
                          <button
                            type="button"
                            onClick={() => handleSort('uptime')}
                            className='cursor-pointer flex items-center gap-2 ml-7 whitespace-nowrap'
                          >
                            Uptime
                            {renderSortIcon('uptime')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getValidators()?.map((validator, index) => {
                        const uptime = getUptime(validator);
                        const uptimePercent = percent(uptime);
                        return (
                          <tr key={validator.operator_address} className={index % 2 === 0 ? '!bg-gray-900' : ''}>
                            <td
                              data-label="Validator: "
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer'
                            >
                              <AppLink href={`/staking/${validator.operator_address}`} className="hover:text-lumera-teal">
                                {validator.description.moniker}
                              </AppLink>
                            </td>
                            <td
                              data-label="Staked Amount: "
                              align='right'
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer'
                            >
                              {formatToken({
                                amount: validator.tokens,
                                denom: staking.params.bond_denom,
                              }, true, '0,0')}
                            </td>
                            <td
                              data-label="Commission: "
                              align='right'
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer'
                            >
                              <Text>{formatCommissionRate(validator.commission?.commission_rates?.rate)}</Text>
                            </td>
                            <td
                              data-label="Voting Power: "
                              align='right'
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer'
                            >
                              <Text>{calculatePercent(validator.delegator_shares, totalPower)}</Text>
                            </td>
                            <td data-label="Uptime: ">
                              <div className='flex w-full justify-between items-center gap-3 action-col pl-7'>
                                <div className='flex items-center gap-3 cursor-pointer' onClick={() => handleValidatorClick(validator.operator_address)}>
                                  <div className='custom-progress'>
                                    <Progress size="$4" value={Number(uptimePercent.replace('%', ''))}>
                                      <Progress.Indicator animation="bouncy" />
                                    </Progress>
                                  </div>
                                  <Text className={uptime && uptime > 0.95 ? 'text-green-500' : 'text-red-500'}>{uptimePercent}</Text>
                                </div>
                                {validator.jailed ?
                                  <div className='btn-jailed'>Jailed</div> :
                                  <div className='btn-primary'>
                                    <Button
                                      onPress={() => delegateOptions.onSelectValidator(validator.operator_address)}
                                    >
                                      Delegate
                                    </Button>
                                  </div>
                                }
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }
        </div>
      </Card.Header>
    </Card>
  )
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

     return `Congratulations! Rewards have been claimed from ${validator.description.moniker} successfully.`
  }

  const getValidatorName = (delegation: TUnbondingDelegation, validator: IValidator | undefined) => {
    if (delegation.type !== 'redelegations') {
      return validator?.description?.moniker || formatAddress(delegation.validator_address, 12, -6)
    }
    const sourceValidator = getAllValidators().find(v => v.operator_address === delegation.validator_src_address);
    const destinationValidator = getAllValidators().find(v => v.operator_address === delegation.validator_dst_address);

    if (!sourceValidator || !destinationValidator) {
      return '--'
    }

    return (
      <span className='flex flex-wrap items-center gap-1'>
        <span>{sourceValidator?.description?.moniker?.slice(0, 5)}...</span> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right-icon lucide-arrow-right w-5 h-5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> <span>{destinationValidator?.description?.moniker}</span>
      </span>
    )
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
      name = validator?.description?.moniker || '';
    }

    if (unbondOptions?.optionsAdvanced?.validator) {
      const validator = getAllValidators().find((item) => item.operator_address === unbondOptions?.optionsAdvanced?.validator);
      validatorName = validator?.description?.moniker || '';
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
                  <H3 className='text-lumera-label'>Total Staked LUME</H3>
                  <div className='text-[40px] font-bold text-white !leading-11'>
                    {staking.isLoading ?
                      <Skeleton /> : <>
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
                  <H3 className='text-lumera-label'>Staking Rewards APR</H3>
                  <div className='!text-lumera-green font-bold text-[40px] !leading-11'>
                    {staking.isAPRLoading ?
                      <Skeleton /> : <>
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
                        <p className="text-sm text-gray-400">My Staking Amount</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white">
                            {staking.isLoading || isAccountInfoLoading ?
                              <Skeleton /> : <>
                                  {formatToken({
                                  amount: `${getMyTotalStaked()}`,
                                  denom: staking.params.bond_denom,
                                }, true, '0,0.[000000]')}
                              </>
                            }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Claimable Rewards</p>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-400">
                          {staking.isLoading || isAccountInfoLoading ?
                            <Skeleton /> : <>
                              {formatToken({
                                amount: `${getTotalRewards()}`,
                                denom: staking.params.bond_denom,
                              }, true, '0,0.[000000]')}
                            </>
                          }
                        </p>
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
                          className={`px-4 py-2 font-medium cursor-pointer ${staking.subTab === 'delegations' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                        >
                          Staking
                        </button>
                        <button
                          onClick={() => staking.onSubTabChange('unstake')}
                          className={`px-4 py-2 font-medium cursor-pointer ${staking.subTab === 'unstake' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                        >
                          Unstake/Restake
                        </button>
                        <button
                          onClick={() => staking.onSubTabChange('activities')}
                          className={`px-4 py-2 font-medium cursor-pointer ${staking.subTab === 'activities' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                        >
                          Activities
                        </button>
                      </div>
                    </div>
                    <div className="mt-6">
                      {staking.subTab === 'delegations' && (
                        <div className='relative'>
                          <Loading isLoading={isAccountInfoLoading} />
                          <div className="overflow-x-auto">
                            <div className="min-w-[950px] space-y-2">
                              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                                <div className="col-span-2">Delegations</div>
                                <div className="col-span-2 text-right">Staked</div>
                                <div className="col-span-1 text-right">Commission </div>
                                <div className="col-span-2 text-right">Claimable</div>
                                <div className="col-span-5"></div>
                              </div>
                              {!isAccountInfoLoading && !accountInfo?.delegations.length ? (
                                <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
                                  <div className='col-span-12'>
                                    <H3>No data</H3>
                                  </div>
                                </div>
                              ) : null}
                              {accountInfo?.delegations.map(delegation => {
                                const validator = getAllValidators().find(v => v.operator_address === delegation.delegation.validator_address);
                                const reward = accountInfo?.rewards.find(v => v.validator_address === delegation.delegation.validator_address);

                                return (
                                  <div
                                    key={delegation.delegation.validator_address}
                                    className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg"
                                  >
                                    <div
                                      className="col-span-2"
                                    >
                                      <AppLink
                                        href={`/staking/${delegation.delegation.validator_address}`}
                                        className="font-semibold text-white hover:text-lumera-teal cursor-pointer"
                                      >
                                        {validator?.description?.moniker || formatAddress(delegation.delegation.validator_address, 10, -5)}
                                      </AppLink>
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-white">
                                      {formatToken({
                                        amount: delegation.balance.amount,
                                        denom: delegation.balance.denom,
                                      }, true, '0,0.[000000]')}
                                    </div>
                                    <div className='col-span-1 text-right'>
                                      {formatCommissionRate(validator?.commission?.commission_rates?.rate)}
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-teal-400">
                                      {validator?.jailed ?
                                        <span className='text-red-600'>Jailed</span> : <>
                                          {formatTokens(reward?.reward)}
                                        </>
                                      }
                                    </div>
                                    <div className="col-span-5 flex justify-end gap-1">
                                        <AppButton
                                          className="!py-1.5 !px-4 !text-sm"
                                          onClick={() => delegateOptions.onSelectValidator(delegation.delegation.validator_address)}
                                        >
                                          Stake
                                        </AppButton>
                                        <AppButton
                                          className={`!py-1.5 !px-4 !text-sm ${validator?.jailed || !reward || getReward(reward) <= 0 ? 'opacity-50 !cursor-not-allowed' : ''}`}
                                          variant='secondary'
                                          onClick={() => claim.handleToggleClaimItemModal(true, delegation)}
                                          disabled={validator?.jailed || !reward || getReward(reward) <= 0}
                                        >
                                          Claim
                                        </AppButton>
                                        <AppButton
                                          className="!py-1.5 !px-4 !text-sm"
                                          onClick={() => redelegateOptions.onOpenModal(
                                            delegation.delegation.validator_address,
                                            formatToken({
                                              amount: delegation.balance.amount,
                                              denom: delegation.balance.denom,
                                            }, false, '0,0.[000000]'),
                                            validator?.description?.moniker ? `${validator?.description?.moniker}` : '',
                                          )}
                                        >
                                          Restake
                                        </AppButton>
                                        <AppButton
                                          className="!py-1.5 !px-4 !text-sm"
                                          onClick={() => unbondOptions.onOpenModal(
                                            delegation.delegation.validator_address,
                                            formatToken({
                                              amount: delegation.balance.amount,
                                              denom: delegation.balance.denom,
                                            }, false, '0,0.[000000]'),
                                            validator?.description?.moniker ? `${validator?.description?.moniker}` : '',
                                          )}
                                        >
                                          Unbond
                                        </AppButton>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {staking.subTab === 'unstake' && (
                        <div className='relative'>
                          <Loading isLoading={unbonding.isLoading} />
                          <div className="overflow-x-auto">
                            <div className="min-w-[950px] space-y-2">
                              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                                <div className="col-span-2">Validator</div>
                                <div className="col-span-2 text-right">Initial balance</div>
                                <div className="col-span-2 text-right">Balance</div>
                                <div className="col-span-2 text-right">Action</div>
                                <div className="col-span-4 text-right">Completion Time</div>
                              </div>
                              {!unbonding.isLoading && !unbonding.unbondingDelegations.length ? (
                                <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
                                  <div className='col-span-12'>
                                    <H3>No data</H3>
                                  </div>
                                </div>
                              ) : null}
                              {unbonding.unbondingDelegations.map((delegation, i) => {
                                const validator = getAllValidators().find(v => v.operator_address === delegation.validator_address);

                                return (
                                  <div key={`${delegation.type}-${delegation.delegator_address}-${delegation.validator_address}-${delegation.validator_src_address}-${delegation.validator_dst_address}`} className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg">
                                    <div className="col-span-2 text-white hover:text-lumera-teal cursor-pointer">
                                      <AppLink href={`/staking/${delegation.validator_address}`} className="hover:text-lumera-teal">
                                        {getValidatorName(delegation, validator)}
                                      </AppLink>
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
                                    <div className="col-span-2 text-right font-mono text-white">
                                      {delegation.type === 'redelegations' ? 'Redelegate' : 'Unstaking'}
                                    </div>
                                    <div className="col-span-4 text-right font-mono text-gray-300">
                                      <CountDown targetDate={new Date(delegation.entries[0].completion_time)} className="whitespace-nowrap" />
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
                            <div className="min-w-5xl space-y-2">
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                                    <div className="col-span-1">Block</div>
                                    <div className="col-span-3">TX Hash</div>
                                    <div className="col-span-2">Messages</div>
                                    <div className="col-span-2 text-right">Amount</div>
                                    <div className="col-span-4 text-right">Time</div>
                                </div>
                                {!activityData.isActivitiesLoading && !activityData.activities.length ? (
                                  <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
                                    <div className='col-span-12'>
                                      <H3>No data</H3>
                                    </div>
                                  </div>
                                ) : null}
                                {activityData.activities.map((tx) => (
                                    <div key={tx.txhash} className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg text-sm">
                                        <div className="col-span-1 text-gray-300">
                                          <AppLink
                                            href={`/block/${tx.height}`}
                                            className="hover:text-lumera-teal truncate flex items-center gap-1.5"
                                          >
                                            {tx.height}<ArrowUpRight className="w-3 h-3"/>
                                          </AppLink>
                                        </div>
                                        <div className="col-span-3">
                                          <AppLink
                                            href={`/tx/${tx.txhash}`}
                                            className="hover:text-lumera-teal truncate flex items-center gap-1.5"
                                          >
                                            {formatAddress(tx.txhash, 12, -6)}<ArrowUpRight className="w-3 h-3"/>
                                          </AppLink>
                                        </div>
                                        <div className="col-span-2 font-medium text-white">
                                          {getMessages(tx.tx.body.messages)}
                                        </div>
                                        <div className="col-span-2 text-right text-white">
                                          {mapAmount(tx.events)?.join(", ")}
                                        </div>
                                        <div className="col-span-4 text-gray-400 flex justify-end whitespace-nowrap">
                                          {dayjs(tx.timestamp).format('MMMM DD, YYYY')} at {dayjs(tx.timestamp).format('HH:mm:ss')}
                                          (<PastTime pastDate={new Date(tx.timestamp)} className='text-sm whitespace-nowrap' />)
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
