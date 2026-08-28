import {
  XCircle,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowDownLeft,
  BadgeDollarSign,
  CircleArrowDown,
  CircleArrowUp,
  CircleDotDashed,
  CircleMinus,
  FilePlus2,
  Gift,
  HandCoins,
  Receipt,
  Repeat2,
  Vote,
  Waypoints,
} from 'lucide-react';
import { H3 } from 'tamagui';
import ReactPaginate from 'react-paginate';
import dayjs from 'dayjs';

import AppLink from '@/components/AppLink';
import Loading from '@/components/Loading';
import PastTime from '@/components/PastTime';
import { ITransaction } from '@/hooks/useTransaction';
import {
  getPrimaryTransactionType,
  getTransactionDisplayType,
  isTransactionSuccessful,
} from '@/utils/transaction-history';

import 'react-paginate/theme/basic/react-paginate.css';

interface ITransactionHistory {
  transactions: ITransaction[];
  totalTransactions: number;
  isLoading: boolean;
  handlePageClick: ({ selected }: { selected: number }) => void;
  bech32Address?: string;
  ethAddress?: string;
}

const getTxIcon = (type: string) => {
  switch(getPrimaryTransactionType(type)) {
    case 'Send':
      return <ArrowUpRight className="w-5 h-5 text-red-400" />;
    case 'EthereumTx Send':
      return <CircleArrowUp className="w-5 h-5 text-red-400" />;
    case 'Recv':
      return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
    case 'EthereumTx Recv':
      return <CircleArrowDown className="w-5 h-5 text-green-400" />;
    case 'Self Transfer':
      return <ArrowLeftRight className="w-5 h-5 text-blue-400" />;
    case 'EthereumTx Self':
      return <CircleDotDashed className="w-5 h-5 text-blue-400" />;
    case 'Vote':
      return <Vote className="w-5 h-5 text-violet-400" />;
    case 'SubmitProposal':
      return <FilePlus2 className="w-5 h-5 text-purple-400" />;
    case 'Deposit':
      return <BadgeDollarSign className="w-5 h-5 text-sky-400" />;
    case 'BeginRedelegate':
      return <Repeat2 className="w-5 h-5 text-cyan-400" />;
    case 'Delegate':
      return <HandCoins className="w-5 h-5 text-indigo-400" />;
    case 'Undelegate':
      return <CircleMinus className="w-5 h-5 text-orange-400" />;
    case 'WithdrawDelegatorReward':
      return <Gift className="w-5 h-5 text-amber-400" />;
    case 'MultiSend':
    case 'Transfer':
      return <Waypoints className="w-5 h-5 text-blue-400" />;
    case 'EthereumTx':
      return <Receipt className="w-5 h-5 text-gray-400" />;
    case 'Failed':
      return <XCircle className="w-5 h-5 text-gray-500" />;
    default:
      return <ArrowLeftRight className="w-5 h-5 text-gray-400" />;
  }
};

const getColor = (type: string) => {
  switch(getPrimaryTransactionType(type)) {
    case 'Send':
    case 'EthereumTx Send':
    case 'Failed':
      return 'bg-red-500/20';
    case 'Recv':
    case 'EthereumTx Recv':
      return 'bg-green-500/20';
    case 'Self Transfer':
    case 'EthereumTx Self':
      return 'bg-blue-500/20';
    case 'Vote':
      return 'bg-violet-500/20';
    case 'SubmitProposal':
      return 'bg-purple-500/20';
    case 'Deposit':
      return 'bg-sky-500/20';
    case 'Delegate':
      return 'bg-indigo-500/20';
    case 'BeginRedelegate':
      return 'bg-cyan-500/20';
    case 'Undelegate':
      return 'bg-orange-500/20';
    case 'WithdrawDelegatorReward':
      return 'recent-activity-icon';
    case 'MultiSend':
    case 'Transfer':
      return 'bg-blue-500/20';
    default:
      return 'bg-gray-500/20';
  }
}

export default function TransactionHistory({
  transactions,
  totalTransactions,
  isLoading,
  handlePageClick,
  bech32Address,
  ethAddress,
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
          {transactions.map((tx) => {
            const transactionType = getTransactionDisplayType(tx, {
              bech32Address,
              ethAddress,
            });

            return (
              <div key={tx.txhash} className="md:grid md:grid-cols-[9rem_minmax(20rem,1fr)_9rem_6rem_17rem] gap-3 items-center bg-gray-900/40 p-4 rounded-lg hover:bg-gray-800/60 transition-colors mb-3 md:mb-0">
              <div className="w-full">
                <div className="md:hidden font-semibold text-gray-500 mr-2">Block Height: </div>
                <div className='flex items-center mt-1 md:mt-0'>
                  <div className={`p-2 rounded-full inline-block ${getColor(transactionType)}`}>
                    {getTxIcon(transactionType)}
                  </div>
                  <AppLink href={`/blocks/${tx.height}`} className="text-white ml-2 hover:text-lumera-green">{tx.height}</AppLink>
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
                title={transactionType}
              >
                <div className="md:hidden font-semibold text-gray-500 mr-2">TX Type: </div>
                {transactionType}
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
            );
          })}
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
