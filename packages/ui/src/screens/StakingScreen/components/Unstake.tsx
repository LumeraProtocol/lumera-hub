import { useState, ReactNode } from 'react';
import dayjs from 'dayjs';
import { H3 } from 'tamagui';
import {
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import AppLink from '@/components/AppLink';
import Loading from '@/components/Loading';
import CountDown from '@/components/CountDown';
import {
  TSigningInfos,
  IReward,
  IValidator,
  TUnbondingDelegation,
} from '@/types';
import { formatToken, formatAddress } from '@/utils/format';

interface IUnstake {
  unbonding: {
    isLoading: boolean;
    unbondingDelegations: TUnbondingDelegation[];
    unbondingDelegationsError: string;
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
  allValidators: IValidator[];
}

export default function Unstake({
  unbonding,
  staking,
  allValidators,
}: IUnstake) {
  const [sortBy, setSortBy] = useState('time');
  const [sort, setSort] = useState('ASC');

  const getValidatorName = (delegation: TUnbondingDelegation, validator: IValidator | undefined) => {
      if (delegation.type !== 'redelegations') {
        return validator?.description?.moniker || formatAddress(delegation.validator_address, 12, -6)
      }
      const sourceValidator = allValidators.find(v => v.operator_address === delegation.validator_src_address);
      const destinationValidator = allValidators.find(v => v.operator_address === delegation.validator_dst_address);

      if (!sourceValidator || !destinationValidator) {
        return '--'
      }

      return destinationValidator?.description?.moniker
    }

  const sortFunc = (a: TUnbondingDelegation, b: TUnbondingDelegation) => {
    switch (sortBy) {
      case 'validator':
        const aValidator = allValidators.find(v => v.operator_address === a.validator_address);
        const bValidator = allValidators.find(v => v.operator_address === b.validator_address);
        if (sort === 'DESC') {
          return getValidatorName(b, bValidator).toLowerCase().localeCompare(getValidatorName(a, aValidator).toLowerCase()) || 0;
        }
        return getValidatorName(a, aValidator).toLowerCase().localeCompare(getValidatorName(b, bValidator).toLowerCase()) || 0;
      case 'initial':
        if (sort === 'DESC') {
          return Number(b.entries[0].initial_balance) - Number(a.entries[0].initial_balance);
        }
        return Number(a.entries[0].initial_balance) - Number(b.entries[0].initial_balance);
      case 'balance':
        if (sort === 'DESC') {
          return Number(b.entries[0].balance) - Number(a.entries[0].balance);
        }
        return Number(a.entries[0].balance) - Number(b.entries[0].balance);
      case 'action':
        if (sort === 'DESC') {
          return b?.type?.toLowerCase()?.localeCompare(a.type.toLowerCase());
        }
        return a.type.toLowerCase().localeCompare(b.type.toLowerCase());
      default:
        if (sort === 'DESC') {
          return dayjs(b.entries[0].completion_time).valueOf() - dayjs(a.entries[0].completion_time).valueOf();
        }
        return dayjs(a.entries[0].completion_time).valueOf() - dayjs(b.entries[0].completion_time).valueOf();
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
      <Loading isLoading={unbonding.isLoading} />
      <div className="overflow-x-auto">
        <div className="min-w-[950px] space-y-2">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => handleSort('validator')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Validator
                {renderSortIcon('validator')}
              </button>
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => handleSort('initial')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Initial balance
                {renderSortIcon('initial')}
              </button>
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => handleSort('balance')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Balance
                {renderSortIcon('balance')}
              </button>
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => handleSort('action')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Action
                {renderSortIcon('action')}
              </button>
            </div>
            <div className="col-span-4 text-right">
              <button
                type="button"
                onClick={() => handleSort('time')}
                className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
              >
                Completion Time
                {renderSortIcon('time')}
              </button>
            </div>
          </div>
          {!unbonding.isLoading && !unbonding.unbondingDelegations.length ? (
            <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
              <div className='col-span-12'>
                <H3>No data</H3>
              </div>
            </div>
          ) : null}
          {unbonding.unbondingDelegations.sort((a, b) => sortFunc(a, b)).map((delegation, i) => {
            const validator = allValidators.find(v => v.operator_address === delegation.validator_address);

            return (
              <div key={`${delegation.type}-${delegation.delegator_address}-${delegation.validator_address}-${delegation.validator_src_address}-${delegation.validator_dst_address}`} className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg">
                <div className="col-span-2 text-white hover:text-lumera-teal cursor-pointer">
                  <AppLink href={`/staking/${delegation.validator_address}`} className="text-lumera-teal hover:text-lumera-green">
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
  )
}
