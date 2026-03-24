import { useState, Fragment } from 'react';
import { Card, Tooltip } from 'tamagui';
import {
  Check,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

import { AppLoading } from '@/components/Loading';
import SectionTitle from '@/components/SectionTitle';
import AppButton from '@/components/AppButton';
import CountDown from '@/components/CountDown';
import AppLink from '@/components/AppLink';
import PastTime from '@/components/PastTime';
import StakeModal from './StakingScreen/components/StakeModal';
import UnbondModal from '@/components/UnbondModal';
import RedelegateModal from '@/components/RedelegateModal';
import useAccount from '@/hooks/useAccount';
import useAccountInfo from '@/hooks/useAccountInfo';
import useRedelegate from '@/hooks/useRedelegate';
import useUnbond from '@/hooks/useUnbond';
import useDelegate from '@/hooks/useDelegate';
import { getFileType } from '@/hooks/useCascade';
import { DENOM } from '@/contants/network';
import { RATE_VALUE } from '@/contants';
import {
  formatToken,
  formatTokens,
  formatAddress,
  percent,
  formatBytes,
  formatTokenDisplay,
} from '@/utils/format';
import {
  getMessages,
  mapAmount,
  getSimplifiedType,
} from '@/utils/helpers';
import { getFileIcon, getFileStatus, getStatusColor } from './CascadeScreen';

interface IPubKey {
  pubKey: string;
  type: string;
}

interface ISeriesData {
  value: number;
  name: string;
}

const COLORS = ['#088a8a', '#47c78a', '#bce4a6', '#ff9a30', '#ffae3e', '#fed847'];

const PubKey = ({
  pubKey,
  type,
}: IPubKey) => {
  const [currentTab, setCurrentTab] = useState('type');

  return (
    <div>
      <div className="inline-flex border-b border-gray-700 w-auto">
        <button
          onClick={() => setCurrentTab('type')}
          className={`px-4 py-2 font-medium cursor-pointer text-base ${currentTab === 'type' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          @Type
        </button>
        <button
          onClick={() => setCurrentTab('key')}
          className={`px-4 py-2 font-medium cursor-pointer text-base ${currentTab === 'key' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          Key
        </button>
      </div>
      <div className='mt-3'>
        {currentTab === 'type' ?
          <div className='text-base truncate'>{type}</div> : null
        }
        {currentTab === 'key' ?
          <div className='text-base truncate'>{pubKey}</div> : null
        }
      </div>
    </div>
  )
}

export const AccountScreen = () => {
  const delegate = useDelegate();
  const accountInfo = useAccountInfo();
  const redelegate = useRedelegate({
    callback: () => {
      accountInfo.fetchData();
    },
  });
  const unbond = useUnbond({
    callback: () => {
      accountInfo.fetchData();
    },
  });
  const {
    isAccountLoading,
    account,
    isDelegationsLoading,
    delegations,
    validators,
    isRewardsLoading,
    rewards,
    isUnbondingDelegationsLoading,
    unbondingDelegations,
    isTransactionsLoading,
    transactions,
    isRecentReceivedLoading,
    recentReceived,
    isBalancesLoading,
    balances,
    delegationsTab,
    isCascadeFilesLoading,
    cascades,
    isValidatorsLoading,
    handleDelegationsTabChange,
  } = useAccount();

  const getTotalReward = () => {
    return rewards.reduce((total, item) => total + Number(item?.reward?.[0]?.amount || 0), 0);
  }

  const getTotalBalances = () => {
    return balances.reduce((total, item) => total + Number(item?.amount || 0), 0);
  }

  const getTotalUnbondingDelegations = () => {
    return unbondingDelegations.reduce((total, item) => total + Number(item?.entries?.[0]?.balance || 0), 0)
  }

  const getTotalDelegations = () => {
    return delegations.reduce((total, item) => total + Number(item?.balance?.amount || 0), 0);
  }

  const calculatePercent = (value: number) => {
    const totalAmount = getTotalReward() + getTotalUnbondingDelegations() + getTotalBalances() + getTotalDelegations();

    return percent((Number(value) * 100 / totalAmount) / 100);
  }

  const getOption = () => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: function (param: any) {
          return `
            <div>
              <div>${param.seriesName}</div>
              <div>${param.marker} ${param.name}: <strong>${formatToken({
                amount: param.value,
                denom: DENOM,
              })}</strong></div>
            </div>
          `
        },
      },
      color: COLORS,
      series: [
        {
          name: 'Assets',
          type: 'pie',
          radius: ['90%', '55%'],
          label: {
            show: false,
            position: 'center'
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: Number(getTotalBalances()),
              name: 'Balance',
            },
            {
              value: Number(getTotalDelegations()),
              name: 'Staking',
            },
            {
              value: Number(getTotalReward()),
              name: 'Reward',
            },
            {
              value: Number(getTotalUnbondingDelegations()),
              name: 'Unbonding',
            },
          ]
        }
      ]
    }
  }

  const getStakingOverviewOption = () => {
    const xAxisData: string[] = [];
    const seriesData: ISeriesData[] = [];

    for (let i = 0; i <= delegations.length - 1; i++) {
      const delegation = delegations[i]
      const validator = validators.find((v) => v.operator_address === delegation?.delegation?.validator_address);
      const value = formatToken({
        amount: delegation.balance.amount,
        denom: DENOM,
      }, false);
      seriesData.push({
        value: Number(value.replaceAll(',', '')),
        name: validator?.description?.moniker || formatAddress(delegation?.delegation?.validator_address, 8, 3),
      });
      xAxisData.push(`${i + 1}`);
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: function (param: any) {
          return `
            <div>
              <div>${param.seriesName}</div>
              <div>${param.marker} ${param.name}: <strong>${param.value} LUME(${calculatePercent(Number(param.value) * RATE_VALUE)})</strong></div>
            </div>
          `;
        },
      },
      grid: {
        left: 5,
        right: 5,
        top: 10,
        bottom: 0,
        containLabel: false,
      },
      color: COLORS,
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          showMinLabel: true,
          showMaxLabel: true,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          show: false,
        },
        axisLine: {
          show: true,
        }
      },
      series: [
        {
          name: 'Staking',
          type: 'bar',
          barMaxWidth: 20,
          data: seriesData,
        }
      ]
    }
  }

  const delegateOptions= {
    isVoteLoading: delegate.isLoading,
    error: delegate.error,
    optionsAdvanced: delegate.optionsAdvanced,
    showAdvanced: delegate.showAdvanced,
    validators: delegate.validators,
    totalValidators: delegate.totalValidators,
    isLoading: delegate.isFetchValidatorLoading,
    isOpenModal: delegate.isOpenModal,
    transactionHash: delegate.transactionHash,
    selectedModal: delegate.selectedModal,
    onCloseCongratulationsModal: delegate.handleCloseCongratulationsModal,
    onCloseDailogChange: delegate.handleCloseModal,
    onOpenModal: delegate.handleOpenModal,
    onSendClick: delegate.handleSendClick,
    onInputChange: delegate.handleInputChange,
    onAdvancedCheckedChange: delegate.handleShowAdvancedChange,
    onStakingButtonClick: delegate.handleStakingButtonClick,
    onCloseContinueToStakingModal: delegate.handleCloseContinueToStakingModal,
    onSelectValidator: delegate.handleSelectValidator,
    onStakingAmountChange: delegate.handleStakingAmountChange,
  };
  const unbondOptions= {
    isUnbondLoading: unbond.isLoading,
    error: unbond.error,
    optionsAdvanced: unbond.optionsAdvanced,
    showAdvanced: unbond.showAdvanced,
    isOpenModal: unbond.isOpenModal,
    availableAmount: unbond.availableAmount,
    transactionHash: unbond.transactionHash,
    onCloseCongratulationsModal: unbond.handleCloseCongratulationsModal,
    onCloseDailogChange: unbond.handleCloseModal,
    onOpenModal: unbond.handleOpenModal,
    onSendClick: unbond.handleSendClick,
    onInputChange: unbond.handleInputChange,
    onAdvancedCheckedChange: unbond.handleShowAdvancedChange,
  };
  const redelegateOptions= {
    isRedelegateLoading: redelegate.isLoading,
    error: redelegate.error,
    optionsAdvanced: redelegate.optionsAdvanced,
    showAdvanced: redelegate.showAdvanced,
    isOpenModal: redelegate.isOpenModal,
    availableAmount: redelegate.availableAmount,
    validators: redelegate.validators,
    transactionHash: redelegate.transactionHash,
    onCloseCongratulationsModal: redelegate.handleCloseCongratulationsModal,
    onCloseDailogChange: redelegate.handleCloseModal,
    onOpenModal: redelegate.handleOpenModal,
    onSendClick: redelegate.handleSendClick,
    onInputChange: redelegate.handleInputChange,
    onAdvancedCheckedChange: redelegate.handleShowAdvancedChange,
  }

  return (
    <div className="space-y-8 text-base">
      <Card elevate size="$4" bordered className='w-full !p-6 mt-5'>
        <div className='relative'>
          {isAccountLoading ?
            <div className="relative min-h-60 flex items-center justify-center">
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='relative w-10 h-10 z-50'
              />
            </div> :
            <div>
              {account ?
                <div className="text-base">
                  <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-2 px-4'>
                    <div className='w-full md:w-52 text-gray-500'>@Type</div>
                    <div className='w-full truncate'>
                      {account['@type']}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
                    <div className='w-full md:w-52 text-gray-500'>Address</div>
                    <div className='w-full truncate'>
                      {account.address}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
                    <div className='w-full md:w-52 text-gray-500'>Pub Key</div>
                    <div className='w-full'>
                      <PubKey
                        pubKey={account?.pub_key?.key || ''}
                        type={account?.pub_key?.['@type'] || ''}
                      />
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
                    <div className='w-full md:w-52 text-gray-500'>Account Number</div>
                    <div className='w-full truncate'>
                      {account.account_number}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-3 px-4'>
                    <div className='w-full md:w-52 text-gray-500'>Sequence</div>
                    <div className='w-full truncate'>
                      {account.sequence}
                    </div>
                  </div>
                </div> : <div className="text-xl font-bold py-0">No data</div>
              }
            </div>
          }
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <Card elevate size="$4" bordered className='w-full !p-6'>
          <SectionTitle className='mb-0'>Overview</SectionTitle>
          <div className='mt-3 relative'>
            {isBalancesLoading || isUnbondingDelegationsLoading || isRewardsLoading || isDelegationsLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div className='full relative flex justify-between items-center flex-col sm:flex-row gap-4'>
                <div className="w-full sm:w-7/12">
                  <ReactECharts option={getOption()} style={{ height: '280px', width: '100%' }} />
                </div>
                <ul className="w-full sm:w-5/12 text-sm grid grid-cols-2 gap-y-2 sm:block">
                  <li>
                    <div className='flex items-center gap-2'>
                      <span
                        className="w-2 h-2 inline-block rounded-full min-w-4 min-h-4"
                        style={{ backgroundColor: COLORS[0] }}
                      />
                      <span className='text-lumera-label'>Balance</span>
                    </div>
                    <div className='text-xl font-bold'>
                      {formatToken({
                        amount: `${getTotalBalances()}`,
                        denom: DENOM,
                      })}
                    </div>
                  </li>
                  <li className='sm:mt-3'>
                    <div className='flex items-center gap-2'>
                      <span
                        className="w-2 h-2 inline-block rounded-full min-w-4 min-h-4"
                        style={{ backgroundColor: COLORS[1] }}
                      />
                      <span className='text-lumera-label'>Staking</span>
                    </div>
                    <div className='text-xl font-bold'>
                      {formatToken({
                        amount: `${getTotalDelegations()}`,
                        denom: DENOM,
                      })}
                    </div>
                  </li>
                  <li className='sm:mt-3'>
                    <div className='flex items-center gap-2'>
                      <span
                        className="w-2 h-2 inline-block rounded-full min-w-4 min-h-4"
                        style={{ backgroundColor: COLORS[2] }}
                      />
                      <span className='text-lumera-label'>Reward</span>
                    </div>
                    <div className='text-xl font-bold'>
                      {formatToken({
                        amount: `${getTotalReward()}`,
                        denom: DENOM,
                      })}
                    </div>
                  </li>
                  <li className='sm:mt-3'>
                    <div className='flex items-center gap-2'>
                      <span
                        className="w-2 h-2 inline-block rounded-full min-w-4 min-h-4"
                        style={{ backgroundColor: COLORS[3] }}
                      />
                      <span className='text-lumera-label'>Unbonding</span>
                    </div>
                    <div className='text-xl font-bold'>
                      {formatToken({
                        amount: `${getTotalUnbondingDelegations()}`,
                        denom: DENOM,
                      })}
                    </div>
                  </li>
                </ul>
              </div>
            }
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full !p-6'>
          <SectionTitle className='mb-0'>Staking</SectionTitle>
          <div className='mt-3 relative'>
            {isBalancesLoading || isUnbondingDelegationsLoading || isRewardsLoading || isDelegationsLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div className='w-full relative'>
                {delegations?.length ?
                  <>
                    <ReactECharts option={getStakingOverviewOption()} style={{ height: '180px', width: '100%' }} />
                    <ul className='grid grid-cols-2 sm:grid-cols-4 gap-x-3 text-sm mt-3 text-lumera-label'>
                      {delegations.map((item, index) => {
                        const validator = validators.find((v) => v.operator_address === item.delegation.validator_address);
                        if (!validator) {
                          return null;
                        }
                        const value = formatToken({
                          amount: item.balance.amount,
                          denom: DENOM,
                        }, false);
                        return (
                          <li key={index}>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <div className='truncate'>
                                  {index + 1}: {validator?.description.moniker}
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                scale={1}
                                x={0}
                                y={0}
                                opacity={1}
                                animation={[
                                  'quick',
                                  {
                                    opacity: {
                                      overshootClamping: true,
                                    },
                                  },
                                ]}
                              >
                                <div className='text-white'>
                                  {index + 1}: {validator?.description.moniker}: {value} LUME({calculatePercent(Number(value.replaceAll(',', '')) * RATE_VALUE)})
                                </div>
                              </Tooltip.Content>
                            </Tooltip>
                          </li>
                        )
                      })}
                    </ul>
                  </> :
                  <div className='flex items-center justify-center w-full min-h-[275px]'>
                    <div className="text-xl font-bold py-4">No data</div>
                  </div>
                }
              </div>
            }
          </div>
        </Card>
      </div>

      <div className='w-full mt-5 mb-0 overflow-x-auto'>
        <ul className='flex !gap-0 list-none tabs'>
          <li className={`tab-item ${delegationsTab === 'delegations' ? 'active' : ''}`}>
            <button
              className='tab-button cursor-pointer px-6'
              onClick={() => handleDelegationsTabChange('delegations')}
            >
              Staking
            </button>
          </li>
          <li className={`tab-item ${delegationsTab === 'unbonding' ? 'active' : ''}`}>
            <button
              className='tab-button cursor-pointer px-6'
              onClick={() => handleDelegationsTabChange('unbonding')}
            >
              Unstake
            </button>
          </li>
          <li className={`tab-item ${delegationsTab === 'transactions' ? 'active' : ''}`}>
            <button
              className='tab-button cursor-pointer px-6'
              onClick={() => handleDelegationsTabChange('transactions')}
            >
              Transactions
            </button>
          </li>
          <li className={`tab-item ${delegationsTab === 'received' ? 'active' : ''}`}>
            <button
              className='tab-button cursor-pointer px-6 whitespace-nowrap'
              onClick={() => handleDelegationsTabChange('received')}
            >
              Recent Received
            </button>
          </li>
          <li className={`tab-item ${delegationsTab === 'cascade' ? 'active' : ''}`}>
            <button
              className='tab-button cursor-pointer px-6 whitespace-nowrap'
              onClick={() => handleDelegationsTabChange('cascade')}
            >
              Cascade
            </button>
          </li>
        </ul>
      </div>
      {delegationsTab === 'delegations' ?
        <Card elevate size="$4" bordered className='w-full !p-6 mt-5'>
          <div className='relative'>
            {isDelegationsLoading || isValidatorsLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div>
                <div className="overflow-x-auto">
                  <div className="md:min-w-[850px] space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400">
                      <div className="col-span-3">Delegations</div>
                      <div className="col-span-3">Staked</div>
                      <div className="col-span-2">Rewards</div>
                      <div className="col-span-4 flex justify-end">
                        <div className="text-left min-w-[240px]">Action</div>
                      </div>
                    </div>

                    {!delegations?.length ?
                      <div className="grid grid-cols-1 items-center bg-gray-900/40 p-4 rounded-lg">
                        <div className="text-xl font-bold">No data</div>
                      </div>: null
                    }

                    {delegations?.map(delegation => {
                      const item = validators.find(v => v.operator_address === delegation?.delegation?.validator_address);
                      const reward = rewards.find(v => v.validator_address === delegation?.delegation?.validator_address);

                      return (
                        <div
                          key={delegation.delegation.validator_address}
                          className="grid grid-cols-12 gap-[6px] md:gap-4 items-center bg-gray-900/40 p-4 rounded-lg"
                        >
                          <div className="col-span-12 md:col-span-3">
                            <div className="md:hidden text-gray-500 mr-2">Delegations: </div>
                            <AppLink
                              href={`/staking/${item?.operator_address}`}
                              className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                            >
                              {item?.description?.moniker}
                            </AppLink>
                          </div>
                          <div className="col-span-12 md:col-span-3 text-white">
                            <div className="md:hidden text-gray-500 mr-2">Staked: </div>
                            <span>
                              {formatToken({
                                amount: delegation?.balance?.amount,
                                denom: delegation?.balance?.denom,
                              }, true, '0,0.[000000]')}
                            </span>
                          </div>
                          <div className='col-span-12 md:col-span-2'>
                            <div className="md:hidden text-gray-500 mr-2">Rewards: </div>
                            <span>
                               {item?.jailed ?
                                  <span className='text-red-600'>Jailed</span> : <>
                                    {formatTokens(reward?.reward)}
                                  </>
                                }
                            </span>
                          </div>
                          <div className="col-span-12 md:col-span-4 flex justify-start md:justify-end gap-1 mt-2 md:mt-0">
                            <AppButton
                              className="!py-1.5 !px-4 !text-sm !font-normal"
                              onClick={() => delegateOptions.onSelectValidator(delegation?.delegation?.validator_address)}
                            >
                              Stake
                            </AppButton>
                            <AppButton
                              className="!py-1.5 !px-4 !text-sm !font-normal"
                              onClick={() => redelegate.handleOpenModal(
                                delegation?.delegation?.validator_address,
                                formatToken({
                                  amount: delegation?.balance?.amount,
                                  denom: delegation?.balance?.denom,
                                }, false, '0,0.[000000]'),
                                item?.description?.moniker ? `${item?.description?.moniker}` : '',
                              )}
                            >
                              Restake
                            </AppButton>
                            <AppButton
                              className="!py-1.5 !px-4 !text-sm !font-normal"
                              onClick={() => unbond.handleOpenModal(
                                delegation?.delegation?.validator_address,
                                formatToken({
                                  amount: delegation?.balance?.amount,
                                  denom: delegation?.balance?.denom,
                                }, false, '0,0.[000000]'),
                                item?.description?.moniker ? `${item?.description?.moniker}` : '',
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
            }
          </div>
        </Card> : null
      }
      {delegationsTab === 'unbonding' ?
        <Card elevate size="$4" bordered className='w-full !p-6 mt-5'>
          <div className='relative'>
            {isAccountLoading || isValidatorsLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div>
                <div className="overflow-x-auto">
                  <div className="md:min-w-[850px] space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400">
                      <div className="col-span-2">Validator</div>
                      <div className="col-span-2">Creation Height</div>
                      <div className="col-span-2">Initial balance</div>
                      <div className="col-span-2">Balance</div>
                      <div className="col-span-4 text-right">Completion Time</div>
                    </div>
                    {!unbondingDelegations?.length ?
                      <div className="grid grid-cols-1 items-center bg-gray-900/40 p-4 rounded-lg">
                        <div className="text-xl font-bold">No data</div>
                      </div>: null
                    }
                    {unbondingDelegations.map((delegation, i) => {
                      const validator = validators.find(v => v.operator_address === delegation?.validator_address);

                      return (
                        <Fragment key={`${delegation.delegator_address}-${delegation.validator_address}-${i}`}>
                          <div
                            className="grid grid-cols-12 gap-[6px] md:gap-4 items-center bg-gray-900/40 p-4 rounded-lg text-base"
                          >
                            <div className="col-span-12 md:col-span-2 text-white">
                              <div className="md:hidden text-gray-500 mr-2">Validator: </div>
                              <AppLink
                                href={`/staking/${delegation.validator_address}`}
                                className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                              >
                                {validator?.description?.moniker}
                              </AppLink>
                            </div>
                            <div className="col-span-12 md:col-span-2 text-white">
                              <div className="md:hidden text-gray-500 mr-2">Creation Height: </div>
                              <AppLink
                                href={`/block/${delegation.entries?.[0]?.creation_height}`}
                                className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                              >
                                {delegation.entries?.[0]?.creation_height}
                              </AppLink>
                            </div>
                            <div className="col-span-12 md:col-span-2 text-white">
                              <div className="md:hidden text-gray-500 mr-2">Initial balance: </div>
                              {formatToken({
                                amount: delegation.entries?.[0]?.initial_balance,
                                denom: DENOM,
                              }, true, '0,0.[00]')}
                            </div>
                            <div className="col-span-12 md:col-span-2 text-white">
                              <div className="md:hidden text-gray-500 mr-2">Balance: </div>
                              {formatToken({
                                amount: delegation.entries?.[0]?.balance,
                                denom: DENOM,
                              }, true, '0,0.[00]')}
                            </div>
                            <div className="col-span-12 md:col-span-4 md:text-right text-gray-300">
                              <div className="md:hidden text-gray-500 mr-2">Completion Time: </div>
                              <CountDown targetDate={new Date(delegation.entries?.[0]?.completion_time)} className="md:whitespace-nowrap" />
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            }
          </div>
        </Card> : null
      }

      {delegationsTab === 'transactions' ?
        <Card elevate size="$4" bordered className='w-full !p-6 mt-5'>
          <div className='relative'>
            {isTransactionsLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div>
                <div className="overflow-x-auto">
                  <div className="md:min-w-[950px] space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400">
                      <div className="col-span-1">Height</div>
                      <div className="col-span-4">TX Hash</div>
                      <div className="col-span-3">Messages</div>
                      <div className="col-span-4 text-right">Time</div>
                    </div>
                    {!transactions?.length ?
                      <div className="grid grid-cols-1 items-center bg-gray-900/40 p-4 rounded-lg">
                        <div className="text-xl font-bold">No data</div>
                      </div>: null
                    }
                    {transactions.sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()).map((tx) => (
                      <div key={tx.txhash} className="grid grid-cols-12 gap-[6px] md:gap-4 items-center bg-gray-900/40 p-4 rounded-lg text-base">
                        <div className="col-span-12 md:col-span-1 text-gray-300">
                          <div className="md:hidden text-gray-500 mr-2">Height: </div>
                          <AppLink
                            href={`/block/${tx.height}`}
                            className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                          >
                            {tx.height}
                          </AppLink>
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <div className="md:hidden text-gray-500 mr-2">TX Hash: </div>
                          <AppLink
                            href={`/tx/${tx.txhash}`}
                            className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                          >
                            {formatAddress(tx.txhash, 12, -6)}
                          </AppLink>
                        </div>
                        <div className="col-span-12 md:col-span-3 font-medium text-white">
                          <div className="md:hidden text-gray-500 mr-2">Messages: </div>
                          <div className="flex items-center gap-2">
                            {getMessages(tx.tx.body.messages)}
                            {tx.code === 0 ?
                              <Check className='w-5 h-5 text-lumera-teal' /> : <X className='w-5 h-5 text-lumera-red' />
                            }
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-4 text-gray-400 md:flex md:justify-end sm:whitespace-nowrap">
                          <div className="md:hidden text-gray-500 mr-2">Time: </div>
                          {dayjs(tx.timestamp).format('MMMM DD, YYYY')} at {dayjs(tx.timestamp).format('HH:mm:ss')}<span className="inline-block sm:hidden"> </span>(<PastTime pastDate={new Date(tx.timestamp)} className='text-sm md:whitespace-nowrap' />)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          </div>
        </Card> : null
      }
      {delegationsTab === 'received' ?
        <Card elevate size="$4" bordered className='w-full !p-6 mt-5'>
          <div className='relative'>
            {isRecentReceivedLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div>
                <div className="overflow-x-auto">
                  <div className="md:min-w-[900px] space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400">
                      <div className="col-span-1">Height</div>
                      <div className="col-span-4">TX Hash</div>
                      <div className="col-span-3">Amount</div>
                      <div className="col-span-4 text-right">Time</div>
                    </div>
                    {!recentReceived?.length ?
                      <div className="grid grid-cols-1 items-center bg-gray-900/40 p-4 rounded-lg">
                        <div className="text-xl font-bold">No data</div>
                      </div>: null
                    }
                    {recentReceived.sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()).map((tx) => (
                      <div key={tx.txhash} className="grid grid-cols-12 gap-[6px] md:gap-4 items-center bg-gray-900/40 p-4 rounded-lg text-base">
                        <div className="col-span-12 md:col-span-1 text-gray-300">
                          <div className="md:hidden text-gray-500 mr-2">Height: </div>
                          <AppLink
                            href={`/block/${tx.height}`}
                            className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                          >
                            {tx.height}
                          </AppLink>
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <div className="md:hidden text-gray-500 mr-2">TX Hash: </div>
                          <AppLink
                            href={`/tx/${tx.txhash}`}
                            className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                          >
                            {formatAddress(tx.txhash, 12, -6)}
                          </AppLink>
                        </div>
                        <div className="col-span-12 md:col-span-3 text-white">
                          <div className="md:hidden text-gray-500 mr-2">Amount: </div>
                          <div className="flex items-center gap-2">
                            {formatTokenDisplay({
                              amount: mapAmount(tx.events)?.join(", ").replaceAll('ulume', '') || '0',
                              denom: DENOM,
                            }, false)} LUME
                            {tx.code === 0 ?
                              <Check className='w-5 h-5 text-lumera-teal' /> : <X className='w-5 h-5 text-lumera-red' />
                            }
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-4 text-gray-400 md:flex md:justify-end sm:whitespace-nowrap">
                          <div className="md:hidden text-gray-500 mr-2">Time: </div>
                          {dayjs(tx.timestamp).format('MMMM DD, YYYY')} at {dayjs(tx.timestamp).format('HH:mm:ss')}<span className="inline-block sm:hidden"> </span>(<PastTime pastDate={new Date(tx.timestamp)} className='text-sm md:whitespace-nowrap' />)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          </div>
        </Card> : null
      }
      {delegationsTab === 'cascade' ?
        <Card elevate size="$4" bordered className='w-full !p-6 mt-5'>
          <div className='relative'>
            {isCascadeFilesLoading ?
              <div className="relative min-h-60 flex items-center justify-center">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div>
                <div className="overflow-x-auto">
                  <div className="md:min-w-[900px] space-y-2">
                    <table className='w-full border-separate border-spacing-y-0'>
                      <thead className='hidden md:table-header-group text-gray-400 text-sm'>
                        <tr>
                          <th align='left' className='pl-4 pr-2 py-2 pb-4'>Name</th>
                          <th align='left' className='px-2 py-2 pb-4'>Public</th>
                          <th align='left' className='px-2 py-2 pb-4'>Status</th>
                          <th align='left' className='px-2 py-2 pb-4'>TX ID</th>
                          <th align='right' className='px-2 py-2 pb-4'>Price</th>
                          <th align='right' className='px-2 py-2 pb-4'>Fee</th>
                          <th align='right' className='px-2 py-2 pb-4'>Size</th>
                          <th align='left' className='pl-2 pr-4 py-2 pb-4'>Last Modified</th>
                        </tr>
                      </thead>
                      <tbody className='text-base'>
                        {!cascades?.length ?
                          <tr className='odd:bg-gray-900/40 even:bg-gray-900 hover:bg-gray-800/60 rounded-lg flex flex-col md:table-row text-base'>
                            <td className="p-4 text-xl font-bold" colSpan={8}>No data</td>
                          </tr>: null
                        }
                        {cascades.sort((a, b) => dayjs(b.finalize_tx_time || b?.register_tx_time).valueOf() - dayjs(a.finalize_tx_time || b?.register_tx_time).valueOf()).map((file) => {
                          const isExpired = file.state === 'ACTION_STATE_EXPIRED';
                          const lastModified = file?.finalize_tx_time || file?.register_tx_time;
                          return (
                            <tr className='odd:bg-gray-900/40 even:bg-gray-900 hover:bg-gray-800/60 rounded-lg flex flex-col md:table-row text-base' key={file.id}>
                              <td className='px-2 pt-3 pb-1 md:py-2'>
                                <div className='flex items-center gap-2 w-full'>
                                  {getFileIcon(getSimplifiedType(getFileType(file.decoded.file_name)))}
                                  <span className="font-medium text-white max-w-[180px] truncate">
                                    {file.decoded.file_name}
                                  </span>
                                </div>
                              </td>
                              <td className='px-2 pt-1 pb-1 md:py-2'>
                                <div className="md:hidden text-gray-500 mr-2">Public: </div>
                                <span>{file?.decoded?.public ? 'Yes' : 'No'}</span>
                              </td>
                              <td className='px-2 pt-1 pb-1 md:py-2'>
                                <div className="md:hidden text-gray-500 mr-2">Status: </div>
                                <span className={`capitalize ${getStatusColor(file.state)}`}>{getFileStatus(file.state)}</span>
                              </td>
                              <td className='px-2 pt-1 pb-1 md:py-2'>
                                <div className="md:hidden text-gray-500 mr-2">TX ID: </div>
                                <AppLink
                                  href={`/tx/${file.register_tx_id}`}
                                  className="font-mono text-lumera-teal hover:text-lumera-green truncate inline-flex items-center gap-1.5"
                                >
                                  {formatAddress(file.register_tx_id, 6, -4)}
                                </AppLink>
                              </td>
                              <td className='px-2 pt-1 pb-1 md:py-2 md:text-right'>
                                <div className="md:hidden text-gray-500 mr-2">Price: </div>
                                <span className=' whitespace-nowrap'>{!isExpired ? formatToken({
                                  amount: file.price.amount,
                                  denom: DENOM,
                                }) : '0 LUME'}</span>
                              </td>
                              <td className='px-2 pt-1 pb-1 md:py-2 md:text-right'>
                                <div className="md:hidden text-gray-500 mr-2">Fee: </div>
                                <span className=' whitespace-nowrap'>{file.fee}</span>
                              </td>
                              <td className='px-2 pt-1 pb-1 md:py-2 md:text-right'>
                                <div className="md:hidden text-gray-500 mr-2">Size: </div>
                                <span className=' whitespace-nowrap'>{formatBytes(!isExpired ? file.size : 0)}</span>
                              </td>
                              <td className='px-2 pt-1 pb-3 md:py-2'>
                                <div className="md:hidden text-gray-500 mr-2 whitespace-nowrap">Last Modified: </div>
                                {lastModified ?
                                <span className='whitespace-nowrap'>
                                  {dayjs(lastModified).format('MM/DD/YYYY')} at {dayjs(lastModified).format('HH:mm:ss')}
                                </span> : '--'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
          </div>
        </Card> : null
      }

      <StakeModal
        isOpen={delegateOptions.selectedModal === 'stake'}
        availableAmount={getTotalBalances()}
        onClose={delegateOptions.onCloseContinueToStakingModal}
        onStakingAmountChange={delegateOptions.onStakingAmountChange}
        onCloseContinueToStakingModal={delegateOptions.onCloseContinueToStakingModal}
        onSendClick={delegateOptions.onSendClick}
        validators={validators}
        validator={delegateOptions.optionsAdvanced.validator}
        amount={delegateOptions.optionsAdvanced.amount}
        transactionHash={delegateOptions.transactionHash}
        isLoading={delegateOptions.isVoteLoading}
        error={delegateOptions.error || ''}
        isAccountLoading={accountInfo.loading}
        onRefreshBalance={accountInfo.fetchData}
      />
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
        validatorName={''}
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
    </div>
  )
}
