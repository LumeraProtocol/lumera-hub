import { useState } from 'react';
import dayjs from 'dayjs';
import { H3 } from 'tamagui';
import {
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import AppLink from '@/components/AppLink';
import PastTime from '@/components/PastTime';
import { AppLoading } from '@/components/Loading';
import { IRecentActivity } from '@/types';
import { formatAddress } from '@/utils/format';
import {
  getMessages,
  mapAmount,
} from '@/utils/helpers';

interface IActivities {
  activityData: {
    isActivitiesLoading: boolean;
    activities: IRecentActivity[];
    activitiesError: string;
  };
}

export default function Activities({
  activityData,
}: IActivities) {
  const [sortBy, setSortBy] = useState('time');
  const [sort, setSort] = useState('DESC');

  const getAmountSort = (events: any) => {
    return parseFloat(mapAmount(events)?.join(", ") || '0').toString();
  }

  const sortFunc = (a: IRecentActivity, b: IRecentActivity) => {
    switch (sortBy) {
      case 'block':
        if (sort === 'DESC') {
          return Number(b.height) - Number(a.height);
        }
        return Number(a.height) - Number(b.height);
      case 'hash':
        if (sort === 'DESC') {
          return b.txhash.toLowerCase().localeCompare(a.txhash.toLowerCase());
        }
        return a.txhash.toLowerCase().localeCompare(b.txhash.toLowerCase());
      case 'messages':
        if (sort === 'DESC') {
          return getMessages(b.tx.body.messages).toLowerCase().localeCompare(getMessages(a.tx.body.messages).toLowerCase());
        }
        return getMessages(a.tx.body.messages).toLowerCase().localeCompare(getMessages(b.tx.body.messages).toLowerCase());
      case 'amount':
        if (sort === 'DESC') {
          return Number(getAmountSort(b.events)) - Number(getAmountSort(a.events));
        }
        return Number(getAmountSort(a.events)) - Number(getAmountSort(b.events));
      default:
        if (sort === 'DESC') {
          return dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf();
        }
        return dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf();
    }
  }

  const handleSort = (name: string) => {
    const newSort = name === sortBy ? sort === 'DESC' ? 'ASC' : 'DESC' : 'DESC'
    setSort(newSort);
    setSortBy(name);
  }

  const renderSortIcon = (name: string) => {
    if (sortBy !== name) {
      return null
    }

    if (sort === 'DESC') {
      return <ArrowDown className='w-4 h-4' />
    }

    return <ArrowUp className='w-4 h-4' />
  }

  return (
    <div className='relative'>
      {activityData.isActivitiesLoading ?
        <div className='min-h-44 relative'>
          <AppLoading
            isLoading
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
          />
        </div> :
        <div className="overflow-x-auto">
          <div className="min:min-w-5xl space-y-2">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-400 uppercase">
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => handleSort('block')}
                  className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
                >
                  Block
                  {renderSortIcon('block')}
                </button>
              </div>
              <div className="col-span-3">
                <button
                  type="button"
                  onClick={() => handleSort('hash')}
                  className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
                >
                  TX Hash
                  {renderSortIcon('hash')}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => handleSort('messages')}
                  className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
                >
                  Messages
                  {renderSortIcon('messages')}
                </button>
              </div>
              <div className="col-span-2 text-right">
                <button
                  type="button"
                  onClick={() => handleSort('amount')}
                  className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
                >
                  Amount
                  {renderSortIcon('amount')}
                </button>
              </div>
              <div className="col-span-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSort('time')}
                  className='cursor-pointer inline-flex items-center gap-1 whitespace-nowrap'
                >
                  Time
                  {renderSortIcon('time')}
                </button>
              </div>
            </div>
            {!activityData.isActivitiesLoading && !activityData.activities.length ? (
              <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg text-sm">
                <div className='col-span-12'>
                  <H3>No data</H3>
                </div>
              </div>
            ) : null}
            {activityData?.activities?.length ?
              <>
                {activityData.activities.sort((a, b) => sortFunc(a, b)).map((tx, index) => (
                  <div key={tx.txhash} className={`grid grid-cols-12 gap-[6px] md:gap-4 items-center ${index % 2 === 0 ? 'bg-gray-900' : 'bg-[#161e2a]'} hover:bg-gray-800/60 transition-colors p-4 rounded-lg text-base`}>
                    <div className="col-span-12 md:col-span-1 text-gray-300">
                      <div className="md:hidden text-gray-500 mr-2">Block: </div>
                      <AppLink
                        href={`/blocks/${tx.height}`}
                        className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                      >
                        {tx.height}<ArrowUpRight className="w-3 h-3"/>
                      </AppLink>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="md:hidden text-gray-500 mr-2">TX Hash: </div>
                      <AppLink
                        href={`/tx/${tx.txhash}`}
                        className="text-lumera-teal hover:text-lumera-green truncate flex items-center gap-1.5"
                      >
                        {formatAddress(tx.txhash, 12, -6)}<ArrowUpRight className="w-3 h-3"/>
                      </AppLink>
                    </div>
                    <div className="col-span-12 md:col-span-2 font-medium text-white">
                      <div className="md:hidden text-gray-500 mr-2">Messages: </div>
                      {getMessages(tx.tx.body.messages)}
                    </div>
                    <div className="col-span-12 md:col-span-2 md:text-right text-white">
                      <div className="md:hidden text-gray-500 mr-2">Amount: </div>
                      {mapAmount(tx.events)?.join(", ")}
                    </div>
                    <div className="col-span-12 md:col-span-4 text-gray-400 md:flex md:justify-end whitespace-nowrap">
                      <div className="md:hidden text-gray-500 mr-2">Time: </div>
                      {dayjs(tx.timestamp).format('MMMM DD, YYYY')} at {dayjs(tx.timestamp).format('HH:mm:ss')}
                      (<PastTime pastDate={new Date(tx.timestamp)} className='text-sm md:whitespace-nowrap' />)
                    </div>
                  </div>
                ))}
              </> : null
            }
          </div>
        </div>
      }
    </div>
  )
}
