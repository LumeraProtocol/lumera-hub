import { useState } from 'react';
import { H3 } from 'tamagui';
import {
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import AppLink from '@/components/AppLink';
import Loading from '@/components/Loading';
import AppButton from '@/components/AppButton';
import {
  IReward,
  IValidator,
  AccountInfoData,
} from '@/types';
import {
  formatToken,
  formatCommissionRate,
  formatAddress,
  formatTokens,
} from '@/utils/format';
import { DelegationResponse } from '@/hooks/useAccountInfo';

interface IStaking {
  isAccountInfoLoading: boolean;
  accountInfo: AccountInfoData | null;
  allValidators: IValidator[];
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
  getReward: (reward: IReward) => number;
}

export default function Staking({
  isAccountInfoLoading,
  accountInfo,
  allValidators,
  delegateOptions,
  claim,
  unbondOptions,
  redelegateOptions,
  getReward,
}: IStaking) {
  const [sortBy, setSortBy] = useState('claimable');
  const [sort, setSort] = useState('DESC');

  const getCommission = (validator_address: string) => {
    const validator = allValidators.find(v => v.operator_address === validator_address);
    return Number(formatCommissionRate(validator?.commission?.commission_rates?.rate).replaceAll('%', ''));
  }

  const getSortReward = (validator_address: string) => {
    const reward = accountInfo?.rewards.find(v => v.validator_address === validator_address);
    return Number(formatTokens(reward?.reward, false).replaceAll(',', ''));
  }

  const sortFunc = (a: DelegationResponse, b: DelegationResponse) => {
    switch (sortBy) {
      case 'delegations':
        const aValidator = allValidators.find(v => v.operator_address === a.delegation.validator_address);
        const bValidator = allValidators.find(v => v.operator_address === b.delegation.validator_address);
        if (sort === 'DESC') {
          return bValidator?.description?.moniker?.toLowerCase()?.localeCompare(aValidator?.description?.moniker?.toLowerCase() || '') || 0;
        }
        return aValidator?.description?.moniker?.toLowerCase()?.localeCompare(bValidator?.description?.moniker?.toLowerCase() || '') || 0;
      case 'staked':
        if (sort === 'DESC') {
          return Number(b.balance.amount) - Number(a.balance.amount);
        }
        return Number(a.balance.amount) - Number(b.balance.amount);
      case 'commission':
        if (sort === 'DESC') {
          return getCommission(b.delegation.validator_address) - getCommission(a.delegation.validator_address);
        }
        return getCommission(a.delegation.validator_address) - getCommission(b.delegation.validator_address);
      default:
        if (sort === 'DESC') {
          return Number(getSortReward(b.delegation.validator_address)) - Number(getSortReward(a.delegation.validator_address));
        }
        return Number(getSortReward(a.delegation.validator_address)) - Number(getSortReward(b.delegation.validator_address));
    }
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
      return <ArrowDown className='w-4 h-4' />
    }

    return <ArrowUp className='w-4 h-4' />
  }

  return (
    <div className='relative'>
      <Loading isLoading={isAccountInfoLoading} />
      <div className="overflow-x-auto">
        <div className="md:min-w-[950px] space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400 uppercase">
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => handleSort('delegations')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Delegations
                {renderSortIcon('delegations')}
              </button>
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => handleSort('staked')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Staked
                {renderSortIcon('staked')}
              </button>
            </div>
            <div className="col-span-1 text-right">
              <button
                type="button"
                onClick={() => handleSort('commission')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Commission
                {renderSortIcon('commission')}
              </button>
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => handleSort('claimable')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Claimable
                {renderSortIcon('claimable')}
              </button>
            </div>
            <div className="col-span-5"></div>
          </div>
          {!isAccountInfoLoading && !accountInfo?.delegations.length ? (
            <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-base">
              <div className='col-span-12'>
                <H3>No data</H3>
              </div>
            </div>
          ) : null}
          {accountInfo?.delegations.length && accountInfo.delegations.sort((a, b) => sortFunc(a, b)).map(delegation => {
            const validator = allValidators.find(v => v.operator_address === delegation.delegation.validator_address);
            const reward = accountInfo?.rewards.find(v => v.validator_address === delegation.delegation.validator_address);

            return (
              <div
                key={delegation.delegation.validator_address}
                className="grid grid-cols-12 gap-[6px] md:gap-4 items-center bg-gray-900/40 p-4 rounded-lg"
              >
                <div
                  className="col-span-12 md:col-span-2"
                >
                  <div className="md:hidden text-gray-500 mr-2">Delegations: </div>
                  <AppLink
                    href={`/staking/${delegation.delegation.validator_address}`}
                    className="text-white hover:text-lumera-teal cursor-pointer"
                  >
                    {validator?.description?.moniker || formatAddress(delegation.delegation.validator_address, 10, -5)}
                  </AppLink>
                </div>
                <div className="col-span-12 md:col-span-2 md:text-right font-mono text-white">
                  <div className="md:hidden text-gray-500 mr-2">Staked: </div>
                  {formatToken({
                    amount: delegation.balance.amount,
                    denom: delegation.balance.denom,
                  }, true, '0,0.[000000]')}
                </div>
                <div className='col-span-12 md:col-span-1 md:text-right'>
                  <div className="md:hidden text-gray-500 mr-2">Commission: </div>
                  {formatCommissionRate(validator?.commission?.commission_rates?.rate)}
                </div>
                <div className="col-span-12 md:col-span-2 md:text-right font-mono text-teal-400">
                  <div className="md:hidden text-gray-500 mr-2">Claimable: </div>
                  {validator?.jailed ?
                    <span className='text-red-600'>Jailed</span> : <>
                      {formatTokens(reward?.reward)}
                    </>
                  }
                </div>
                <div className="col-span-12 md:col-span-5 flex justify-start md:justify-end gap-1 mt-2 md:mt-0">
                  <AppButton
                    className="!py-1.5 !px-4 !text-sm !font-normal"
                    onClick={() => delegateOptions.onSelectValidator(delegation.delegation.validator_address)}
                  >
                    Stake
                  </AppButton>
                  <AppButton
                    className={`!py-1.5 !px-4 !text-sm !font-normal ${validator?.jailed || !reward || getReward(reward) <= 0 ? 'opacity-50 !cursor-not-allowed' : ''}`}
                    variant='secondary'
                    onClick={() => claim.handleToggleClaimItemModal(true, delegation)}
                    disabled={validator?.jailed || !reward || getReward(reward) <= 0}
                  >
                    Claim
                  </AppButton>
                  <AppButton
                    className="!py-1.5 !px-4 !text-sm !font-normal"
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
                    className="!py-1.5 !px-4 !text-sm !font-normal"
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
  )
}
