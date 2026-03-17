'use client';

import { useState } from 'react';
import {
  Card,
  Dialog,
  VisuallyHidden,
  Input,
  Label,
  Select,
  Tooltip,
} from 'tamagui';
import ReactPaginate from 'react-paginate';
import {
  PencilLine,
  X,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import dayjs from 'dayjs';

import { AppLoading } from '@/components/Loading';
import AppButton, { AppLinkButton } from '@/components/AppButton';
import AppLink from '@/components/AppLink';
import SectionTitle from '@/components/SectionTitle';
import useSnag, { ACTION_TYPE } from '@/hooks/admin/useSnag';
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
    open,
    isLoading,
    loyaltyRules,
    isSyncing,
    totalPages,
    selectedLoyalty,
    actionType,
    configForm,
    message,
    isConfigLoading,
    isCurrencySyncing,
    isSectionSyncing,
    sprintID,
    syncLoyaltySections,
    syncLoyaltyCurrencies,
    deleteLoyaltyRules,
    handleInputChange,
    handleSaveConfig,
    handleActionTypeChange,
    syncLoyaltyRules,
    handlePageClick,
    handleCloseModal,
    handleSelectedLoyalty,
  } = useSnag();

  const renderForm = () => {
    if (actionType === 'staked') {
      return (
        <div>
          <div className='mt-1'>
            <Label htmlFor="validator" className='text-base'>Validator Address</Label>
            <div className='input-wrapper'>
              <Input
                id="validator"
                placeholder="Validator Address"
                className='input'
                value={configForm?.staked?.validator || ''}
                onChangeText={(newValue) => handleInputChange('staked', 'validator', newValue)}
              />
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Amount(ulume)</Label>
            <div className='input-wrapper'>
              <Input
                id="amount"
                placeholder="Amount"
                className='input'
                value={configForm?.staked?.amount || '0'}
                onChangeText={(newValue) => handleInputChange('staked', 'amount', newValue)}
              />
            </div>
          </div>
          <LoyaltyRuleVerifyCheck
            loyaltyRule={selectedLoyalty}
            className="text-sm italic"
            isSplit={false}
          />
        </div>
      )
    }

    if (actionType === 'connect') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="domain" className='text-base'>Verify URL</Label>
            <div className='input-wrapper'>
              <Input
                id="domain"
                placeholder="Verify Domain"
                className='input'
                value={configForm.domain}
                onChangeText={(newValue) => handleInputChange('root', 'domain', newValue)}
              />
            </div>
          </div>
          <LoyaltyRuleVerifyCheck
            loyaltyRule={selectedLoyalty}
            className="text-sm italic"
            isSplit={false}
          />
        </>
      )
    }

    if (actionType === 'delegate') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="validator" className='text-base'>Validator Address</Label>
            <div className='input-wrapper'>
              <Input
                id="validator"
                placeholder="Validator Address"
                className='input'
                value={configForm?.delegate?.validator || ''}
                onChangeText={(newValue) => handleInputChange('delegate', 'validator', newValue)}
              />
            </div>
          </div>
          <LoyaltyRuleVerifyCheck
            loyaltyRule={selectedLoyalty}
            className="text-sm italic"
            isSplit={false}
          />
        </>
      )
    }

    if (actionType === 'claim') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="validator" className='text-base'>From Address</Label>
            <div className='input-wrapper'>
              <Input
                id="validator"
                placeholder="From Address"
                className='input'
                value={configForm?.claim?.validator || ''}
                onChangeText={(newValue) => handleInputChange('claim', 'validator', newValue)}
              />
            </div>
          </div>
          <LoyaltyRuleVerifyCheck
            loyaltyRule={selectedLoyalty}
            className="text-sm italic"
            isSplit={false}
          />
        </>
      )
    }

    if (actionType === 'balance') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>LUMERA</Label>
            <div className='input-wrapper'>
              <Input
                id="amount"
                placeholder="Lumera"
                className='input'
                value={configForm?.balance?.amount || '0'}
                onChangeText={(newValue) => handleInputChange('balance', 'amount', newValue)}
              />
            </div>
          </div>
          <LoyaltyRuleVerifyCheck
            loyaltyRule={selectedLoyalty}
            className="text-sm italic"
            isSplit={false}
          />
        </>
      )
    }

    return null;
  }

  const renderConfigModal = () => {
    return (
      <Dialog
        open={open}
        onOpenChange={handleCloseModal}
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
            <div className="relative max-w-3xl">
              <AppLoading
                isLoading={isConfigLoading}
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
              <div className="flex justify-between items-start relative">
                <SectionTitle className='pr-4'>Loyalty Rule Details - {selectedLoyalty?.name}</SectionTitle>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X/>
                </button>
              </div>

              <div className="mt-3 max-h-[88vh] overflow-y-auto">

                <div className='mt-1'>
                  <Label htmlFor="validator" className='text-base'>Action type</Label>
                  <div className=''>
                    <Select
                      id="validator"
                      value={actionType}
                      onValueChange={handleActionTypeChange}
                    >
                      <Select.Trigger width={'100%'} iconAfter={<ChevronDown className='w-4 h-4' />}>
                        <Select.Value placeholder="N/A" />
                      </Select.Trigger>
                      <Select.Content zIndex={200000}>
                        <Select.Viewport minWidth={200}>
                          <Select.Group>
                            {ACTION_TYPE?.map((item, index) => {
                              return (
                                <Select.Item
                                  key={index}
                                  index={index}
                                  value={item.value}
                                >
                                  <Select.ItemText>
                                    {item.label}
                                  </Select.ItemText>
                                </Select.Item>
                              )
                            })}
                          </Select.Group>
                        </Select.Viewport>
                      </Select.Content>
                    </Select>
                  </div>
                </div>
                {actionType && actionType !== 'connect' ?
                  <>
                    <div className='mt-1'>
                      <Label htmlFor="domain" className='text-base'>Verify Domain</Label>
                      <div className='input-wrapper'>
                        <Input
                          id="domain"
                          placeholder="Verify Domain"
                          className='input'
                          value={configForm.domain}
                          onChangeText={(newValue) => handleInputChange('root', 'domain', newValue)}
                        />
                      </div>
                    </div>
                    <div className='mt-1'>
                      <Label htmlFor="urlCheck" className='text-base'>URL Check</Label>
                      <div className='input-wrapper'>
                        <Input
                          id="urlCheck"
                          placeholder="URL Check"
                          className='input'
                          value={configForm.urlCheck}
                          onChangeText={(newValue) => handleInputChange('root', 'urlCheck', newValue)}
                        />
                      </div>
                    </div>
                  </> : null
                }
                {renderForm()}
                {message?.type === 'error' ?
                  <div className="text-red-500 mt-4">{message.content}</div> : null
                }
                {message?.type === 'success' ?
                  <div className="text-lumera-teal mt-4">{message.content}</div> : null
                }
                <div className="mt-4 flex justify-end">
                  <AppButton disabled={isConfigLoading} onClick={handleSaveConfig}>
                    Save
                  </AppButton>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    );
  }

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
                  <span>Create Loyalty Rule</span>
                </AppLinkButton>
                <AppButton
                  disabled={isSyncing}
                  className='disabled:opacity-45'
                  onClick={syncLoyaltyRules}
                >
                  <span>Sync Loyalty Rules</span>
                </AppButton>
                <AppButton
                  disabled={isCurrencySyncing}
                  className='disabled:opacity-45'
                  onClick={syncLoyaltyCurrencies}
                >
                  <span>Sync Loyalty Currencies</span>
                </AppButton>
                <AppButton
                  disabled={isSectionSyncing}
                  className='disabled:opacity-45'
                  onClick={syncLoyaltySections}
                >
                  <span>Sync Loyalty Sections</span>
                </AppButton>
                <AppButton
                  disabled={isSyncing}
                  className='disabled:opacity-45'
                  onClick={deleteLoyaltyRules}
                  variant='third'
                >
                  <span>Clear Loyalty Rules Data</span>
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
                                <AppLink href={`/admin/campaigns/sprints/${sprintID}/${loyaltyRule.id}`}>
                                  <PencilLine className='w-4 h-4' />
                                </AppLink>
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
      {renderConfigModal()}
    </div>
  )
}
