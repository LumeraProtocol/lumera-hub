import { H3, Card } from 'tamagui';
import dayjs from 'dayjs';
import ReactJson from 'react-json-view'

import Loading from '@/components/Loading';
import AppLink from '@/components/AppLink';
import { formatTokens, formatNumber } from '@/utils/format';
import { ITransaction } from '@/hooks/useTransactionDetails';

interface ITransactionDetailsScreen {
  transaction: ITransaction | null;
  isLoading: boolean;
}

export const TransactionDetailsScreen = ({
  transaction,
  isLoading,
}: ITransactionDetailsScreen) => {

  if (!isLoading && !transaction) {
    return (
      <div className="space-y-8">
        <H3 className='text-lumera-label'>Not found</H3>
      </div>
    )
  }
  const messages = transaction?.tx?.body?.messages || [];

  return (
    <div className="space-y-8 relative">
      <Loading isLoading={isLoading} />
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <H3 className='text-lumera-label'>Summary</H3>
        </Card.Header>
        <div className='p-5 pt-0 text-lumera-label'>
          <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
            <div className='w-full md:w-32'>Tx Hash</div>
            <div className='w-full truncate'>{transaction?.tx_response?.txhash}</div>
          </div>
          <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
            <div className='w-full md:w-32'>Height</div>
            <div className='w-full'>
              <AppLink href={`/block/${transaction?.tx_response?.height}`} className='text-lumera-teal hover:text-lumera-green'>
                {transaction?.tx_response?.height}
              </AppLink>
            </div>
          </div>
          <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
            <div className='w-full md:w-32'>Status</div>
            <div className='w-full mt-1 md:mt-0'>
              {!isLoading && transaction ?
              <>
                <span className={`text-xs truncate relative py-2 px-4 w-fit mr-2 rounded text-white ${transaction?.tx_response?.code === 0 ? 'bg-lumera-teal' : 'bg-red-800'}`}>
                  { transaction?.tx_response?.code === 0 ? 'Success' : 'Failed' }
                </span>
                <span>
                  {transaction?.tx_response.code !== 0 ? '' : transaction?.tx_response?.raw_log}
                </span>
              </> : null
              }
            </div>
          </div>
          <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
            <div className='w-full md:w-32'>Time</div>
            <div className='w-full'>
              {transaction?.tx_response?.timestamp ?
              <>
                {dayjs(transaction.tx_response.timestamp).format('MMMM DD, YYYY')} at {dayjs(transaction.tx_response.timestamp).format('HH:mm:ss')}({dayjs(transaction.tx_response.timestamp).fromNow()})
              </> : '--'}
            </div>
          </div>
          <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
            <div className='w-full md:w-32'>Gas</div>
            <div className='w-full'>
               {formatNumber(transaction?.tx_response?.gas_used || '', { decimalsLength: 0 })} / {formatNumber(transaction?.tx_response?.gas_wanted || '', { decimalsLength: 0 })}
            </div>
          </div>
          <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
            <div className='w-full md:w-32'>Fee</div>
            <div className='w-full'>
              {
                transaction ? formatTokens(
                  transaction.tx?.auth_info?.fee?.amount,
                  true,
                  '0,0.[00]'
                ) : '0'
              }
            </div>
          </div>
          <div className='flex items-center flex-col md:flex-row pt-3 px-4'>
            <div className='w-full md:w-32'>Memo</div>
            <div className='w-full'>{transaction?.tx?.body?.memo}</div>
          </div>
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full mt-5'>
        <Card.Header padded>
          <H3>Messages: ({messages.length})</H3>
        </Card.Header>
        <div className='p-5 pt-0'>
          {!messages.length ?
            <H3 className='text-lumera-label'>No messages</H3> :
            <>
              {messages.map((msg, index) => (
                <div className={`border border-slate-800 rounded-md text-lumera-label ${index < messages.length - 1 ? 'mb-4' : ''}`} key={index}>
                  {Object.entries(msg).map(([key, value], idx) => (
                    <div className={`flex items-center flex-col md:flex-row py-3 px-4 ${idx < Object.entries(msg).length - 1 ? 'border-b border-lumera-navy' : ''}`} key={key}>
                      <div className='w-full md:w-48 capitalize'>{key.replaceAll('_', ' ').replaceAll('-', ' ')}</div>
                      <div className='w-full break-all'>
                        {value as string}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full mt-5'>
        <Card.Header padded>
          <H3 className='text-lumera-label'>JSON</H3>
        </Card.Header>
        <div className='p-5 pt-0'>
          {transaction ?
            <div>
              <ReactJson
                src={transaction}
                collapsed={2}
                displayObjectSize={false}
                displayDataTypes={false}
                theme="apathy"
                style={{
                  padding: '10px',
                  borderRadius: '9px',
                  backgroundColor: '#151c29',
                  wordBreak: 'break-all',
                }}
              />
            </div> :
            <H3 className='text-lumera-label'>No JSON</H3>
          }
        </div>
      </Card>
    </div>
  )
}
