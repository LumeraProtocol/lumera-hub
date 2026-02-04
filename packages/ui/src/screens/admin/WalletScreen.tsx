import { Card, Input } from 'tamagui';
import { Search, } from 'lucide-react';
import dayjs from 'dayjs';
import ReactPaginate from 'react-paginate';

import SectionTitle from '@/components/SectionTitle';
import AppLink from '@/components/AppLink';
import { AppLoading } from '@/components/Loading';
import PastTime from '@/components/PastTime';
import { IWallet } from '@/hooks/admin/useWallet';

interface IWalletScreen {
  isLoading: boolean;
  wallets: IWallet[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  keyword: string;
  handlePageClick: ({ selected }: { selected: number }) => void;
  handleSearchChange: (val: string) => void;
}

export const WalletScreen = ({
  isLoading,
  wallets,
  currentPage,
  totalPages,
  keyword,
  pageSize,
  handlePageClick,
  handleSearchChange,
}: IWalletScreen) => {
  return (
    <div className="space-y-8">
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <div className='flex justify-between w-full'>
            <SectionTitle className="mb-2">Wallet</SectionTitle>
            <div className="relative w-full sm:w-auto">
              <div className='input-wrapper'>
                <Input
                  id="keyword"
                  placeholder="Search address"
                  className='input !pr-[50px] min-w-40'
                  value={keyword}
                  onChangeText={handleSearchChange}
                />
                <span className='input-symbol'>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                </span>
              </div>
            </div>
          </div>
        </Card.Header>
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
              <table className='w-full border-separate border-spacing-y-2'>
                <thead className='hidden md:table-header-group text-gray-400 text-sm'>
                  <tr>
                    <th align='left' className='px-2 py-3'>No.</th>
                    <th align='left' className='px-2 py-3'>Wallet Address</th>
                    <th align='left' className='px-2 py-3'>First Connected</th>
                    <th align='left' className='px-2 py-3'>Last connected</th>
                    <th align='left' className='px-2 py-3'>Period</th>
                    <th align='left' className='px-2 py-3'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet, index) => (
                    <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={wallet.id}>
                      <td className='px-2 py-3'>
                        {(currentPage - 1) * pageSize + (index + 1)}
                      </td>
                      <td className='px-2 py-3'>
                        {wallet.address}
                      </td>
                      <td className='px-2 py-3'>
                        {dayjs(wallet.first_connected * 1000).format('HH:mm MM/DD/YYYY')}
                      </td>
                      <td className='px-2 py-3'>
                        {dayjs((wallet.last_action_timestamp || wallet.first_connected) * 1000).format('HH:mm MM/DD/YYYY')}
                      </td>
                      <td className='px-2 py-3'>
                        <PastTime
                          pastDate={new Date((wallet.last_action_timestamp || wallet.first_connected) * 1000)}
                          className='text-sm md:whitespace-nowrap'
                        />
                      </td>
                      <td className='px-2 py-3'>
                        <AppLink href={`/admin/action/${wallet.address}`}>Details</AppLink>
                      </td>
                    </tr>
                  ))}
                  {!wallets.length ?
                    <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                      <td className='px-2 py-3' colSpan={6}>
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
