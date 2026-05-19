import { useState, useEffect } from 'react';
import {
  Card,
  SizableText,
  Input,
  Text,
  Progress,
  Button,
} from 'tamagui';
import { Search } from '@tamagui/lucide-icons';
import {
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import AppLink from '@/components/AppLink';
import AppButton from '@/components/AppButton';
import { AppLoading } from '@/components/Loading';
import SectionTitle from '@/components/SectionTitle';
import useAppRouter from '@/hooks/useAppRouter';
import { IValidator } from '@/types';
import {
  formatToken,
  formatCommissionRate,
  percent,
} from '@/utils/format';
import { calculatePercent } from '@/utils/helpers';

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

export default function AllValidators({
  staking,
  totalPower,
  delegateOptions,
  getUptime,
}: IAllValidators) {
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
            <SectionTitle className='mb-0'>All Validators</SectionTitle>
            <SizableText className='text-lumera-label !text-base'>Delegate your stake to a validator to earn rewards.</SizableText>
          </div>
          <div className='w-full sm:w-80'>
            <div className='input-wrapper'>
              <Input
                id="amount"
                placeholder="Search validator"
                className='input has-symbol'
                value={keyword}
                onChangeText={handleInputChange}
              />
              <span className='input-symbol'>
                <Search />
              </span>
            </div>
          </div>
        </div>
        <div className='mt-5 relative'>
          {staking.isLoading || !staking?.params?.bond_denom ? (
              <div className='relative my-2 min-h-60'>
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                />
              </div>
            ) : (
              <>
                <ul className='flex gap-0 list-none tabs'>
                  <li className={`tab-item ${staking?.currentTab === 'active' ? 'active' : ''}`}>
                    <button className='tab-button cursor-pointer px-3 !text-base' onClick={() => staking.onTabChange('active')}>Active ({calcTotalValidatorByTab('active')})</button>
                  </li>
                  <li className={`tab-item ${staking?.currentTab === 'inactive' ? 'active' : ''}`}>
                    <button className='tab-button cursor-pointer px-3 !text-base' onClick={() => staking.onTabChange('inactive')}>Inactive ({calcTotalValidatorByTab('inactive')})</button>
                  </li>
                </ul>
                <div className='overflow-x-auto'>
                  <table className='w-full table mt-5'>
                    <thead className='hidden md:table-header-group text-sm'>
                      <tr className='text-sm'>
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
                    <tbody className='text-base'>
                      {getValidators()?.map((validator, index) => {
                        const uptime = getUptime(validator);
                        const uptimePercent = percent(uptime);
                        return (
                          <tr key={validator.operator_address} className={`${index % 2 === 0 ? '!bg-gray-900' : ''} flex flex-col md:table-row text-base`}>
                            <td
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer text-left !pb-1'
                            >
                              <div className="md:hidden font-semibold text-gray-500 mr-2">Validator: </div>
                              <AppLink href={`/staking/${validator.operator_address}`} className="text-lumera-teal hover:text-lumera-green">
                                {validator.description.moniker}
                              </AppLink>
                            </td>
                            <td
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer text-left md:text-right !py-1'
                            >
                              <div className="md:hidden font-semibold text-gray-500 mr-2">Staked Amount: </div>
                              <span className='whitespace-nowrap'>
                                {formatToken({
                                  amount: validator.tokens,
                                  denom: staking.params.bond_denom,
                                }, true, '0,0')}
                              </span>
                            </td>
                            <td
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointer text-left md:text-right !py-1'
                            >
                              <div className="md:hidden font-semibold text-gray-500 mr-2">Commission: </div>
                              <Text>{formatCommissionRate(validator.commission?.commission_rates?.rate)}</Text>
                            </td>
                            <td
                              onClick={() => handleValidatorClick(validator.operator_address)}
                              className='cursor-pointertext-left md:text-right !py-1'
                            >
                              <div className="md:hidden font-semibold text-gray-500 mr-2">Voting Power: </div>
                              <Text>{calculatePercent(validator.delegator_shares, totalPower)}</Text>
                            </td>
                            <td className='!pt-1'>
                              <div className="md:hidden font-semibold text-gray-500 mr-2">Uptime: </div>
                              <div className='flex flex-col md:flex-row w-full md:justify-between items-start md:items-center gap-3 action-col md:pl-7'>
                                <div className='flex items-center gap-3 cursor-pointer' onClick={() => handleValidatorClick(validator.operator_address)}>
                                  <div className='custom-progress'>
                                    <Progress size="$4" value={Number(uptimePercent.replace('%', ''))}>
                                      <Progress.Indicator animation="bouncy" />
                                    </Progress>
                                  </div>
                                  <Text className={uptime && uptime > 0.95 ? 'text-green-500' : 'text-red-500'}>
                                    {uptimePercent}
                                  </Text>
                                </div>
                                {validator.jailed ?
                                  <AppButton variant='third' className='min-w-[96px]'>Jailed</AppButton> :
                                  <AppButton
                                    onClick={() => delegateOptions.onSelectValidator(validator.operator_address)}
                                  >
                                    Delegate
                                  </AppButton>
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
