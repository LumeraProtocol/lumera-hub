'use client';

import {
  Card,
  Tooltip,
  Select,
} from 'tamagui';
import ReactPaginate from 'react-paginate';
import { Check, X, ChevronLeft, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import AppLink from '@/components/AppLink';
import useSnagUserResponse from '@/hooks/admin/useSnagUserResponse';
import { formatAddress } from '@/utils/format';
import { RESPONSE_STATUS } from '@/contants/snag';

export const SnagUserResponsesScreen = () => {
  const {
    isLoading,
    userResponses,
    totalPages,
    keyword,
    status,
    isActionLoading,
    handlePageClick,
    handleSearchChange,
    handleStatusChange,
    handleResponseAction,
  } = useSnagUserResponse();

  return (
    <div className="space-y-8">
      <div className="min-h-[80vh]">
        <div className='text-left'>
          <AppLink
            href='/admin/campaigns/sprints/season-2'
            className="flex items-start gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
          >
            <ChevronLeft className="w-5 h-5"/> <span>Back to Sprints</span>
          </AppLink>
        </div>
        <Card elevate size="$4" bordered className='w-full !min-h-[80vh]'>
          <div className='p-5 flex justify-end'>
            <div className="">
              <Select
                id="status"
                value={status}
                onValueChange={handleStatusChange}
              >
                <Select.Trigger width={'150px'} iconAfter={<ChevronDown className='w-4 h-4' />}>
                  <Select.Value placeholder={RESPONSE_STATUS[0].label} />
                </Select.Trigger>
                <Select.Content zIndex={200000}>
                  <Select.Viewport minWidth={200}>
                    <Select.Group>
                      {RESPONSE_STATUS?.map((item, index) => {
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
          <div className='p-5 pt-0'>
            <table className='w-full border-separate border-spacing-y-2 text-sm'>
              <thead className='hidden md:table-header-group text-gray-400'>
                <tr>
                  <th align='left' className='px-2 py-3'>Quest</th>
                  <th align='left' className='px-2 py-3'>Points</th>
                  <th align='left' className='px-2 py-3'>User Address</th>
                  <th align='left' className='px-2 py-3 w-2/6'>Submitted by user</th>
                  <th align='left' className='px-2 py-3'>Created At</th>
                  <th align='left' className='px-2 py-3 w-32'>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || isActionLoading ?
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
                    {userResponses?.length ?
                      <>
                        {userResponses.map((response) => (
                          <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={response.id}>
                            <td className='px-2 py-3'>
                              {response.loyaltyRule.name}
                            </td>
                            <td className='px-2 py-3'>
                              {response.loyaltyRule.amount}
                            </td>
                            <td className='px-2 py-3'>
                              <div>
                                <Tooltip>
                                  <Tooltip.Trigger>
                                    <span>Lumera Address: {formatAddress(response.lumeraAddress, 15, -5)}</span>
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
                                      {response.lumeraAddress}
                                    </div>
                                  </Tooltip.Content>
                                </Tooltip>
                              </div>
                              <div>
                                <Tooltip>
                                  <Tooltip.Trigger>
                                    <span>Snag Address: {formatAddress(response.snagAddress, 15, -5)}</span>
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
                                      {response.snagAddress}
                                    </div>
                                  </Tooltip.Content>
                                </Tooltip>
                              </div>
                            </td>
                            <td className='px-2 py-3 whitespace-pre-wrap break-all'>
                              {response.content}
                            </td>
                            <td className='px-2 py-3'>
                              {dayjs(response.created_at).format('MMM DD, YYYY HH:mm')}
                            </td>
                            <td className='px-2 py-3'>
                              {response.status === 'pending' ?
                                <div className='flex items-center gap-3'>
                                  <Tooltip>
                                    <Tooltip.Trigger>
                                      <AppButton
                                        onClick={() => handleResponseAction(response.id, response.userId, response.loyaltyRuleId, 'approved')}
                                        disabled={isActionLoading}
                                        className='disabled:opacity-45'
                                      >
                                        <Check className='w-4 h-4' />
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
                                        Approved this response
                                      </div>
                                    </Tooltip.Content>
                                  </Tooltip>
                                  <Tooltip>
                                    <Tooltip.Trigger>
                                      <AppButton
                                        variant='third'
                                        onClick={() => handleResponseAction(response.id, response.userId, response.loyaltyRuleId, 'reject')}
                                        disabled={isActionLoading}
                                        className='disabled:opacity-45'
                                      >
                                        <X className='w-4 h-4' />
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
                                        Reject this response
                                      </div>
                                    </Tooltip.Content>
                                  </Tooltip>
                                </div> :
                                <div className={`capitalize ${response.status === 'reject' ? 'text-lumera-red' : 'text-lumera-teal'}`}>
                                  {response.status}
                                </div>
                              }
                            </td>
                          </tr>
                        ))}
                      </> : <>
                        <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                          <td className='px-2 py-3' colSpan={6}>
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
        </Card>
      </div>
    </div>
  )
}
