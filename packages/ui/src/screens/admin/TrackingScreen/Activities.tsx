import { Card, Tooltip } from 'tamagui';
import dayjs from 'dayjs';
import ReactPaginate from 'react-paginate';
import { Info } from 'lucide-react';

import AppLink from '@/components/AppLink';
import { AppLoading } from '@/components/Loading';
import useAction from '@/hooks/admin/useAction';
import { formatAddress, formatNumber } from '@/utils/format';

export default function Activities() {
  const {
    isLoading,
    wallets,
    currentPage,
    totalPages,
    pageSize,
    handlePageClick,
  } = useAction();

  return (
    <div className="space-y-8">
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-5'>
          {isLoading ?
            <div className='min-h-[200px] relative'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <>
              <table className='w-full border-separate border-spacing-y-2 text-sm'>
                <thead className='hidden md:table-header-group text-gray-400'>
                  <tr>
                    <th align='left' className='px-2 py-3'>No.</th>
                    <th align='left' className='px-2 py-3'>Wallet address</th>
                    <th align='left' className='px-2 py-3'>Tx hash</th>
                    <th align='left' className='px-2 py-3'>
                      <div className='flex items-center gap-1'>
                        <span>Upload</span>
                        <Tooltip>
                          <Tooltip.Trigger>
                            <Info className='w-4 h-4' />
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
                              Total cascade uploaded
                            </div>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    </th>
                    <th align='left' className='px-2 py-3'>Action type</th>
                    <th align='left' className='px-2 py-3'>Action date</th>
                    <th align='left' className='px-2 py-3'>Created at</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet, index) => {
                    const lastActionType = wallet?.last_action_type?.split('.') || [];
                    return (
                      <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={wallet.address}>
                        <td className='px-2 py-3'>
                          {(currentPage - 1) * pageSize + (index + 1)}
                        </td>
                        <td className='px-2 py-3'>
                          <AppLink href="#">
                            {formatAddress(wallet.address, 12, -6)}
                          </AppLink>
                        </td>
                        <td className='px-2 py-3'>
                          <AppLink href={`/tx/${wallet.last_tx_hash}`} target='_blank'>
                            {formatAddress(wallet.last_tx_hash, 12, -6)}
                          </AppLink>
                        </td>
                        <td className='px-2 py-3'>
                          {formatNumber(wallet?.cascade_upload || 0, { decimalsLength: 0 })}
                        </td>
                        <td className='px-2 py-3'>
                          {lastActionType[lastActionType.length - 1]}
                        </td>
                        <td className='px-2 py-3'>
                          {dayjs((wallet.last_action_timestamp || wallet.first_connected)).format('HH:mm MM/DD/YYYY')}
                        </td>
                        <td className='px-2 py-3'>
                          {dayjs(wallet.first_connected).format('HH:mm MM/DD/YYYY')}
                        </td>
                      </tr>
                    )
                  })}
                  {!wallets.length ?
                    <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                      <td className='px-2 py-3' colSpan={7}>
                        <div className='w-full text-xl'>No data</div>
                      </td>
                    </tr> : null
                  }
                </tbody>
              </table>
            </>
          }
          {totalPages > 1 ?
            <div className="paginate-wrapper pt-3">
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
  )
}
