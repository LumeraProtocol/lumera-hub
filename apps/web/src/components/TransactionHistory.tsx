import {
  XCircle,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowDownLeft,
  Layers,
  ClockPlus,
  Unlink,
  Star,
} from 'lucide-react';
import { H3 } from 'tamagui';
import ReactPaginate from 'react-paginate';
import dayjs from 'dayjs';

import AppLink from '@/components/AppLink';
import Loading from '@/components/Loading';
import PastTime from '@/components/PastTime';
import { ITransaction } from '@/hooks/useTransaction';
import { getMessages } from '@/utils/helpers';
import { isTransactionSuccessful } from '@/utils/transaction-history';

import 'react-paginate/theme/basic/react-paginate.css';

interface ITransactionHistory {
  transactions: ITransaction[];
  totalTransactions: number;
  isLoading: boolean;
  handlePageClick: ({ selected }: { selected: number }) => void;
}

const getTxIcon = (type: string) => {
  switch(type) {
    case 'Send':
      return <ArrowUpRight className="w-5 h-5 text-red-400" />;
    case 'Received':
      return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
    case 'BeginRedelegate':
      return <ClockPlus className="w-5 h-5 text-indigo-400" />;
    case 'Delegate':
      return <Layers className="w-5 h-5 text-indigo-400" />;
    case 'Failed':
      return <XCircle className="w-5 h-5 text-gray-500" />;
    case 'Undelegate':
      return <Unlink className='w-5 h-5 text-red-600' />;
    default:
      if (type.indexOf('WithdrawDelegatorReward') !== -1) {
        return <Star className='w-5 h-5 text-amber-400' />;
      }
      return <ArrowLeftRight className="w-5 h-5 text-gray-400" />;
  }
};

const getColor = (type: string) => {
  switch(type) {
    case 'Send':
    case 'Failed':
      return 'bg-red-500/20';
    case 'Delegate':
    case 'BeginRedelegate':
      return 'bg-green-400/20';
    case 'Received':
      return 'bg-green-500/20';
    default:
       if (type.indexOf('WithdrawDelegatorReward') !== -1) {
        return 'recent-activity-icon';
      }
      return 'bg-red-500/20';
  }
}

export default function TransactionHistory({
  transactions,
  totalTransactions,
  isLoading,
  handlePageClick,
}: ITransactionHistory) {
  return (
    <div className="space-y-2 relative w-full">
      <Loading isLoading={isLoading} />
      <div className='w-full overflow-x-auto'>
        <div className='w-full md:min-w-[65rem] text-base'>
          <div className="hidden md:grid md:grid-cols-[9rem_minmax(20rem,1fr)_9rem_6rem_17rem] gap-3 items-center p-4">
            <div className="flex items-center text-gray-500 whitespace-nowrap">
              Block Height
            </div>
            <div className="text-gray-500">
              TX Hash
            </div>
            <div className="text-gray-500 text-left whitespace-nowrap">
              TX Type
            </div>
            <div className="text-gray-500 text-left whitespace-nowrap">
              TX Status
            </div>
            <div className="text-gray-500 text-center">
              Time
            </div>
          </div>
          {transactions.map((tx) => (
            <div key={tx.txhash} className="md:grid md:grid-cols-[9rem_minmax(20rem,1fr)_9rem_6rem_17rem] gap-3 items-center bg-gray-900/40 p-4 rounded-lg hover:bg-gray-800/60 transition-colors mb-3 md:mb-0">
              <div className="w-full">
                <div className="md:hidden font-semibold text-gray-500 mr-2">Block Height: </div>
                <div className='flex items-center mt-1 md:mt-0'>
                  <div className={`p-2 rounded-full inline-block ${getColor(getMessages(tx.tx.body.messages))}`}>
                    {getTxIcon(getMessages(tx.tx.body.messages))}
                  </div>
                  <AppLink href={`/block/${tx.height}`} className="text-white ml-2 hover:text-lumera-green">{tx.height}</AppLink>
                </div>
              </div>
              <div className="w-full min-w-0 mt-3 md:mt-0">
                <div className="md:hidden font-semibold text-gray-500 mr-2">TX Hash: </div>
                <AppLink
                  href={`/tx/${tx.txhash}`}
                  className="block overflow-hidden text-ellipsis text-sm text-white whitespace-nowrap hover:text-lumera-green"
                >
                  {tx.txhash}
                </AppLink>
              </div>
              <div
                className="w-full overflow-hidden text-ellipsis text-left whitespace-nowrap mt-3 md:mt-0"
                title={getMessages(tx.tx.body.messages)}
              >
                <div className="md:hidden font-semibold text-gray-500 mr-2">TX Type: </div>
                {getMessages(tx.tx.body.messages)}
              </div>
              <div className="w-full text-left whitespace-nowrap mt-3 md:mt-0">
                <div className="md:hidden font-semibold text-gray-500 mr-2">TX Status: </div>
                <span className={`truncate relative w-fit rounded ${isTransactionSuccessful(tx) ? 'text-lumera-teal' : 'text-red-500'}`}>
                  {isTransactionSuccessful(tx) ? 'Success' : 'Failed'}
                </span>
              </div>
              <div className="w-full text-sm text-gray-500 md:flex justify-end mt-3 md:mt-0">
                <div className="md:hidden font-semibold text-gray-500 mr-2">Time: </div>
                <span className="text-white pr-1 whitespace-nowrap">{dayjs(tx.timestamp).format('MMMM DD, YYYY')} at {dayjs(tx.timestamp).format('HH:mm:ss')}</span>
                (<PastTime pastDate={new Date(tx.timestamp)} className='text-sm whitespace-nowrap' />)
              </div>
            </div>
          ))}
          {!transactions?.length && !isLoading ?
            <div className="block items-center">
              <H3>No Transactions</H3>
            </div> : null
          }
        </div>
      </div>
      {totalTransactions > 1 ?
        <div className="paginate-wrapper pt-3">
          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            onPageChange={handlePageClick}
            pageRangeDisplayed={3}
            pageCount={totalTransactions}
            previousLabel="<"
            renderOnZeroPageCount={null}
            className='react-paginate'
          />
        </div> : null
      }
    </div>
  );
}
