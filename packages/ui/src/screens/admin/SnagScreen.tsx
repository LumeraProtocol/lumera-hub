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
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import useSnag, { ACTION_TYPE } from '@/hooks/admin/useSnag';
import { formatNumber, formatAddress } from '@/utils/format';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

type TLoyaltyRuleVerifyCheck = {
  loyaltyRule: SnagLoyalty | null;
  className?: string;
}

const LoyaltyRuleVerifyCheck = ({
  loyaltyRule,
  className,
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

  if (config.actionType === ACTION_TYPE[1].value) {
    const path = `${location.origin}/snag/${loyaltyRule.id}/stake`;

    return (
      <div className={`flex gap-1 items-center w-auto mt-2 ${className}`}>
        <span>Verify URL: {path}</span>
        <button
          onClick={() => handleCopyAddress(path)}
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

  return null;
}

export const SnagScreen = () => {
  const {
    open,
    isLoading,
    loyaltyRules,
    isSyncthing,
    totalPages,
    selectedLoyalty,
    actionType,
    configForm,
    message,
    isConfigLoading,
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
    return (
      <div>
        <div className='mt-1'>
          <Label htmlFor="validator" className='text-base'>Validator</Label>
          <div className='input-wrapper'>
            <Input
              id="validator"
              placeholder="validator"
              className='input'
              value={configForm.validator}
              onChangeText={(newValue) => handleInputChange('validator', newValue)}
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
              value={configForm.amount}
              onChangeText={(newValue) => handleInputChange('amount', newValue)}
            />
          </div>
        </div>
        <LoyaltyRuleVerifyCheck loyaltyRule={selectedLoyalty} className="text-sm italic" />
      </div>
    )
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
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white cursor-pointer"><X/></button>
              </div>

              <div className="mt-6">
                <div className='mt-1'>
                  <Label htmlFor="validator" className='text-base'>Action type</Label>
                  <div className=''>
                      <Select
                        id="validator"
                        value={actionType}
                        onValueChange={handleActionTypeChange}
                      >
                        <Select.Trigger width={'100%'} iconAfter={<ChevronDown className='w-4 h-4' />}>
                          <Select.Value placeholder="Select a action type" />
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
                {renderForm()}
                {message?.type === 'error' ?
                  <div className="text-red-500 mt-4">{message.content}</div> : null
                }
                {message?.type === 'success' ?
                  <div className="text-lumera-teal mt-4">{message.content}</div> : null
                }
                <div className="mt-4 flex justify-end">
                  <AppButton disabled={isSyncthing} onClick={handleSaveConfig}>
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

  const renderConfig = (config: string) => {
    if (!config) {
      return null
    }
    const obj = JSON.parse(config);

    switch (obj.actionType) {
      case ACTION_TYPE[1].value:
        return (
          <ul>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Action Type:</span> <span>{obj.actionType}</span>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Validator:</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>{formatAddress(obj.validator, 10, -6)}</span>
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
                      {obj.validator}
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </li>
            <li className='mb-1'>
              <div className="flex gap-2">
                <span>Amount:</span> <span>{formatNumber(obj.amount, { decimalsLength: 0 })}</span>
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
                <AppButton
                  disabled={isSyncthing}
                  className='disabled:opacity-45'
                  onClick={syncLoyaltyRules}
                >
                  <span>Sync Loyalty Rules</span>
                </AppButton>
                <AppButton
                  disabled={isSyncthing}
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
                                {renderConfig(loyaltyRule.config)}
                              </td>
                              <td className='px-2 py-3'>
                                <AppButton
                                  className="!py-1.5 !px-4 !text-sm !font-normal"
                                  onClick={() => handleSelectedLoyalty(loyaltyRule)}
                                >
                                  <PencilLine className='w-4 h-4' />
                                </AppButton>
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
