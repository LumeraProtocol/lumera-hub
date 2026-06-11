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
import AppLink from '@/components/AppLink';
import useReferralStats from '@/hooks/admin/useReferralStats';
import { formatAddress } from '@/utils/format';

export const ReferralStatsScreen = () => {
  const {
    isLoading,
    snagUser,
    totalPages,
    refers,
    handlePageClick,
  } = useReferralStats();

  const renderRefers = (lumeraAddress: string) => {
    if (!lumeraAddress) {
      return null;
    }
    const myRefers = refers[lumeraAddress];
    return myRefers?.map((r, index) => (
      <div key={r.lumeraAddress}>
        {index + 1}. {r.lumeraAddress}
      </div>
    ))
  }

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
          <div className='p-5 pt-0'>
            <table className='w-full border-separate border-spacing-y-2 text-sm'>
              <thead className='hidden md:table-header-group text-gray-400'>
                <tr>
                  <th align='left' className='px-2 py-3'>User</th>
                  <th align='left' className='px-2 py-3'>Referrals</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ?
                  <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                    <td className='px-2 py-3' colSpan={2}>
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
                    {snagUser?.length ?
                      <>
                        {snagUser.map((user) => {
                          return (
                            <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={user.snagAddress}>
                              <td className='px-2 py-3'>
                                <div>
                                  Lumera Address: {user.lumeraAddress}
                                </div>
                                <div>
                                  Snag Address: {user.snagAddress}
                                </div>
                              </td>
                              <td className='px-2 py-3'>
                                {renderRefers(user.lumeraAddress)}
                              </td>
                            </tr>
                          )})}
                      </> : <>
                        <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                          <td className='px-2 py-3' colSpan={2}>
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
