'use client';

import { useState } from 'react';
import {
  Card,
  Tooltip,
} from 'tamagui';
import ReactPaginate from 'react-paginate';
import {
  PencilLine,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';

import { AppLoading } from '@/components/Loading';
import AppButton, { AppLinkButton } from '@/components/AppButton';
import AppLink from '@/components/AppLink';
import useSnag from '@/hooks/admin/useSnag';
import { formatNumber, formatAddress } from '@/utils/format';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

type TLoyaltyRuleVerifyCheck = {
  loyaltyRule: SnagLoyalty | null;
  className?: string;
  isSplit?: boolean;
}

export const LoyaltyRuleVerifyCheck = ({
  loyaltyRule,
  className,
  isSplit = true,
}: TLoyaltyRuleVerifyCheck) => {
  if (!loyaltyRule?.config) {
    return null;
  }

  const [isCopied, setCopied] = useState(false);

  const handleCopyAddress = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000)
  }
  const config = JSON.parse(loyaltyRule.config);
  const path = `${config.domain}snag/${loyaltyRule.id}`;
  let prefix = '';

  switch (config.actionType) {
    case 'staked':
      prefix = '/stake';
      break;
    case 'delegate':
      prefix = '/delegate';
      break;
    case 'redelegated':
      prefix = '/redelegate';
      break;
    case 'balance':
      prefix = '/balance';
      break;
    case 'claim':
      prefix = '/claim';
      break;
    case 'supernode':
      prefix = '/supernode';
      break;
    case 'send':
      prefix = '/send';
      break;
  }

  if (config.actionType === 'connect') {
    return (
      <div className={`flex gap-1 items-center w-auto mt-2 ${className}`}>
        <div className='flex gap-2'><span>Verify URL:</span>
          {isSplit ?
            <Tooltip>
              <Tooltip.Trigger>
                <span>{formatAddress(config.domain, 20, -10)}</span>
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
                  {config.domain}
                </div>
              </Tooltip.Content>
            </Tooltip> :
            <>{config.domain}</>
          }
        </div>
        <button
          onClick={() => handleCopyAddress(config.domain)}
          className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          {!isCopied ?
            <Copy className="w-3 h-3"/> :
            <Check className="w-3 h-3"/>
          }
        </button>
      </div>
    )
  }

  return (
    <div className={`flex gap-1 items-center w-auto mt-2 ${className}`}>
      <div className='flex gap-2'><span>Verify URL:</span>
        {isSplit ?
          <Tooltip>
            <Tooltip.Trigger>
              <span>{formatAddress(`${path}${prefix}`, 20, -10)}</span>
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
                {`${path}${prefix}`}
              </div>
            </Tooltip.Content>
          </Tooltip> :
          <>{`${path}${prefix}`}</>
        }
      </div>
      <button
        onClick={() => handleCopyAddress(`${path}${prefix}`)}
        className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
      >
        {!isCopied ?
          <Copy className="w-3 h-3"/> :
          <Check className="w-3 h-3"/>
        }
      </button>
    </div>
  );
}

export const SnagScreen = () => {
  const {
    isLoading,
    loyaltyRules,
    isSyncing,
    totalPages,
    sprintID,
    isDeleting,
    deleteLoyaltyRule,
    deleteLoyaltyRules,
    syncLoyaltyRules,
    handlePageClick,
  } = useSnag();

  const renderConfig = (config: string | undefined) => {
    if (!config) {
      return null
    }
    const obj = JSON.parse(config);

    switch (obj.actionType) {
      case 'staked':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Staked</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Validator:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{formatAddress(obj?.staked?.validator || '', 10, -6)}</span>
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
                      {obj?.staked?.validator || ''}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Amount:</span> <span>{formatNumber(obj?.staked?.amount || '0', { decimalsLength: 2 })} LUME</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'balance':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Check balance</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Amount:</span> <span>{formatNumber(obj?.balance?.amount || '0', { decimalsLength: 2 })} LUME</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'delegate':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Delegate tokens</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Validator:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{formatAddress(obj?.delegate?.validator || '', 10, -6)}</span>
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
                      {obj?.delegate?.validator || ''}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'claim':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Claim tokens</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>From Address:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{formatAddress(obj?.claim?.validator || '', 10, -6)}</span>
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
                      {obj?.claim?.validator || ''}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'redelegated':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Redelegated</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'supernode':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Supernode</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Days:</span> <span>{obj.supernode.days}</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Supernodes API:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>API Check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.supernode.validatorUrl ? formatAddress(obj.supernode.validatorUrl, 10, -6) : '--'}</span>
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
                      {obj.supernode.validatorUrl || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'send':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Send A Transaction</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      case 'sendTransactions':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Send Transactions</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Type:</span> <span>{obj.sendTransactions.type}</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Condition:</span> {obj.condition}<span>{obj.sendTransactions.transactions} transactions</span>
              </div>
            </li>
          </ul>
        );
      case 'interactModules':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>Interact modules</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Condition:</span> {obj.condition}<span>{obj.interactModules.modules} modules</span>
              </div>
            </li>
          </ul>
        );
      case 'firstTimeDelegation':
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>First-time delegation</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>URL check:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{obj.urlCheck ? formatAddress(obj.urlCheck, 10, -6) : '--'}</span>
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
                      {obj.urlCheck || '--'}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          </ul>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="min-h-[80vh] flex">
        <Card elevate size="$4" bordered className='w-full !min-h-[80vh]'>
          <div>
            <Card.Header padded>
              <div className='flex justify-end gap-3 w-full'>
                <AppLinkButton
                  href="/admin/campaigns/sprints/season-2/create"
                >
                  <span>Create Quest</span>
                </AppLinkButton>
                <AppButton
                  disabled={isSyncing}
                  className='disabled:opacity-45'
                  onClick={syncLoyaltyRules}
                >
                  <span>Sync Quests</span>
                </AppButton>
                <AppButton
                  disabled={isSyncing}
                  className='disabled:opacity-45'
                  onClick={deleteLoyaltyRules}
                  variant='third'
                >
                  <span>Remove All Quests</span>
                </AppButton>
              </div>
            </Card.Header>
            <div className='p-5'>
              <table className='w-full border-separate border-spacing-y-2 text-sm'>
                <thead className='hidden md:table-header-group text-gray-400'>
                  <tr>
                    <th align='left' className='px-2 py-3'>Name</th>
                    <th align='left' className='px-2 py-3'>Type</th>
                    <th align='left' className='px-2 py-3'>Start Time</th>
                    <th align='left' className='px-2 py-3'>Reward Type</th>
                    <th align='left' className='px-2 py-3'>Amount</th>
                    <th align='left' className='px-2 py-3'>Config</th>
                    <th align='left' className='px-2 py-3'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ?
                    <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                      <td className='px-2 py-3' colSpan={7}>
                        <div className='relative min-h-80'>
                          <AppLoading
                            isLoading
                            className="w-10 h-10 !border-2"
                            iconWidth={20}
                            iconHeight={20}
                            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                          />
                        </div>
                      </td>
                    </tr> :
                    <>
                      {loyaltyRules?.length ?
                        <>
                          {loyaltyRules.map((loyaltyRule) => (
                            <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={loyaltyRule.id}>
                              <td className='px-2 py-3'>
                                {loyaltyRule.name}
                                <LoyaltyRuleVerifyCheck loyaltyRule={loyaltyRule} className="text-[12px] italic" />
                              </td>
                              <td className='px-2 py-3'>
                                {loyaltyRule.type}
                              </td>
                              <td className='px-2 py-3'>
                                {dayjs(loyaltyRule.startTime).format('MMM DD, YYYY HH:mm')}
                              </td>
                              <td className='px-2 py-3'>
                                {loyaltyRule.rewardType}
                              </td>
                              <td className='px-2 py-3'>
                                {loyaltyRule.amount}
                              </td>
                              <td className='px-2 py-3'>
                                {renderConfig(loyaltyRule?.config)}
                              </td>
                              <td className='px-2 py-3'>
                                <div className="flex items-center gap-3">
                                  <AppLink
                                    href={`/admin/campaigns/sprints/${sprintID}/${loyaltyRule.id}`}
                                    className='!px-4 !py-2 !rounded-lg font-normal bg-lumera-teal text-white hover:bg-lumera-green focus:bg-lumera-navy '
                                  >
                                    <PencilLine className='w-4 h-4' />
                                  </AppLink>
                                  <Tooltip>
                                    <Tooltip.Trigger>
                                      <AppButton
                                        variant='third'
                                        onClick={() => deleteLoyaltyRule(loyaltyRule.id)}
                                        disabled={isDeleting}
                                        className='disabled:opacity-45'
                                      >
                                        <Trash2 className='w-4 h-4' />
                                      </AppButton>
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
                                        Remove this item
                                      </div>
                                    </Tooltip.Content>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </> : <>
                          <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                            <td className='px-2 py-3' colSpan={7}>
                              <div className='w-full text-xl'>No data</div>
                            </td>
                          </tr>
                        </>
                      }

                    </>
                  }
                </tbody>
              </table>
              {totalPages > 1 ?
                <div className={`paginate-wrapper pt-3 ${isLoading ? 'hidden' : ''}`}>
                  <ReactPaginate
                    breakLabel="..."
                    nextLabel=">"
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={3}
                    pageCount={totalPages}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    className='react-paginate'
                  />
                </div> : null
              }
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
