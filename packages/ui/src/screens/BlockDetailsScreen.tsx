import { useState } from 'react';
import { H3, Card } from 'tamagui';
import { fromBase64, toHex } from '@cosmjs/encoding';
import { RefreshCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { decodeTxRaw } from '@cosmjs/proto-signing';

import Loading from '@/components/Loading';
import AppLink from '@/components/AppLink';
import { IFullBlock } from '@/types';
import { IValidator } from '@/types/validator';
import { consensusPubkeyToHexAddress, hashTx, getMessages } from '@/utils/helpers';

interface IBlockDetailsScreen {
  isLoading: boolean;
  block: IFullBlock | null;
  validators: IValidator[];
}

interface IHexOutput {
  hash: string;
}

const HexOutput = ({
  hash,
}: IHexOutput) => {
  const [isConcert, setConvert] = useState(false);

  if (!hash) {
    return null;
  }

  if (!isConcert) {
    return (
      <div className='w-full flex gap-2'>
        <div className="truncate">{hash}</div>
        <button type='button' onClick={() => setConvert(true)} className="cursor-pointer">
          <RefreshCcw className='w-4 h-4' />
        </button>
      </div>
    );
  }

  return (
    <div className='w-full flex gap-2'>
      <div className="truncate">{toHex(fromBase64(hash)).toUpperCase()}</div>
      <button type='button' onClick={() => setConvert(false)} className="cursor-pointer">
        <RefreshCcw className='w-4 h-4' />
      </button>
    </div>
  );
}

interface IPartSetHeader {
  total: number;
  hash: string;
}

const PartSetHeader = ({
  total,
  hash,
}: IPartSetHeader) => {
  const [currentTab, setCurrentTab] = useState('total');

  return (
    <div>
      <div className="inline-flex border-b border-gray-700 w-auto">
        <button
          onClick={() => setCurrentTab('total')}
          className={`px-4 py-2 font-medium cursor-pointer ${currentTab === 'total' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          Total
        </button>
        <button
          onClick={() => setCurrentTab('hash')}
          className={`px-4 py-2 font-medium cursor-pointer ${currentTab === 'hash' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          Hash
        </button>
      </div>
      <div className='mt-3'>
        {currentTab === 'total' ?
          <div>{total}</div> : null
        }
        {currentTab === 'hash' ?
          <HexOutput hash={hash} /> : null
        }
      </div>
    </div>
  )
}

interface IVersion {
  app: string;
  block: string;
}

const Version = ({
  app,
  block,
}: IVersion) => {
  const [currentTab, setCurrentTab] = useState('block');

  return (
    <div>
      <div className="inline-flex border-b border-gray-700 w-auto">
        <button
          onClick={() => setCurrentTab('block')}
          className={`px-4 py-2 font-medium cursor-pointer ${currentTab === 'block' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          Block
        </button>
        <button
          onClick={() => setCurrentTab('app')}
          className={`px-4 py-2 font-medium cursor-pointer ${currentTab === 'app' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          App
        </button>
      </div>
      <div className='mt-3'>
        {currentTab === 'block' ?
          <div>{block}</div> : null
        }
        {currentTab === 'app' ?
          <div>{app}</div> : null
        }
      </div>
    </div>
  )
}

interface ILastBlockID {
  hash: string;
  part_set_header?: {
    hash: string;
    total: number;
  };
}

const LastBlockID = ({
  hash,
  part_set_header,
}: ILastBlockID) => {
  const [currentTab, setCurrentTab] = useState('hash');

  return (
    <div>
      <div className="inline-flex border-b border-gray-700 w-auto">
        <button
          onClick={() => setCurrentTab('hash')}
          className={`px-4 py-2 font-medium cursor-pointer ${currentTab === 'hash' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          Hash
        </button>
        <button
          onClick={() => setCurrentTab('part_set_header')}
          className={`px-4 py-2 font-medium cursor-pointer ${currentTab === 'part_set_header' ? 'text-white border-b-2 border-lumera-teal' : 'text-gray-400 hover:text-white'}`}
        >
          Part Set Header
        </button>
      </div>
      <div className='mt-3'>
        {currentTab === 'hash' ?
          <HexOutput hash={hash || ''} /> : null
        }
        {currentTab === 'part_set_header' ?
          <div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Total</div>
              <div className="w-full truncate">
                {part_set_header?.total || ''}
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row py-3 px-4'>
              <div className='w-full md:w-52'>Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={part_set_header?.hash || ''} />
              </div>
            </div>
          </div> : null
        }
      </div>
    </div>
  )
}

export const BlockDetailsScreen = ({
  isLoading,
  block,
  validators,
}: IBlockDetailsScreen) => {

  const getValidatorName = (address: string) => {
    if (!address) return address;
    const txt = toHex(fromBase64(address)).toUpperCase();
    const validator = validators.find(
      (x) => consensusPubkeyToHexAddress(x.consensus_pubkey) === txt
    );
    return validator?.description?.moniker;
  }

  return (
    <div className="space-y-8 relative text-lumera-label">
      <Loading isLoading={isLoading} />
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <H3 className='text-lumera-label'>#{block?.block?.header?.height}</H3>
          <div className='mt-3'>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Hash</div>
              <div className='w-full'>
                <HexOutput hash={block?.block_id?.hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row py-3 px-4'>
              <div className='w-full md:w-52'>Part Set Header</div>
              <div className="w-full truncate">
                <PartSetHeader
                  hash={block?.block_id?.part_set_header?.hash || ''}
                  total={block?.block_id?.part_set_header?.total || 0}
                />
              </div>
            </div>
          </div>
        </Card.Header>
      </Card>

      <Card elevate size="$4" bordered className='w-full mt-5'>
        <Card.Header padded>
          <H3 className='text-lumera-label'>Block Header</H3>
          <div className='mt-3'>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Version</div>
              <div className="w-full truncate">
                <Version
                  app={block?.block?.header?.version?.app || ''}
                  block={block?.block?.header?.version?.block  || ''}
                />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Chain Id</div>
              <div className="w-full truncate">
                {block?.block?.header?.chain_id|| ''}
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Height</div>
              <div className="w-full truncate">
                {block?.block?.header?.height|| ''}
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Time</div>
              <div className="w-full truncate">
                {dayjs(block?.block?.header?.time).format('MMMM DD, YYYY')} at {dayjs(block?.block?.header?.time).format('hh:mm:ss A')}
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Last Block Id</div>
              <div className="w-full truncate">
                <LastBlockID
                  hash={block?.block?.header?.last_block_id?.hash || ''}
                  part_set_header={block?.block?.header?.last_block_id?.part_set_header}
                />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Last Commit Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.last_commit_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Data Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.data_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Validators Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.validators_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Next Validators Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.next_validators_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Consensus Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.consensus_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>App Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.app_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Last Results Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.last_results_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Evidence Hash</div>
              <div className="w-full truncate">
                <HexOutput hash={block?.block?.header?.evidence_hash || ''} />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Proposer Address</div>
              <div className="w-full truncate">
                {getValidatorName(block?.block?.header?.proposer_address || '')}
              </div>
            </div>
          </div>
        </Card.Header>
      </Card>

      <Card elevate size="$4" bordered className='w-full mt-5'>
        <Card.Header padded>
          <H3 className='text-lumera-label'>Transactions</H3>
          <div className='mt-3'>
            <div className="overflow-x-auto">
              {block?.block?.data?.txs?.length ?
                <table className="table w-full">
                  <thead>
                    <tr className='text-sm'>
                      <th align='left'>Hash</th>
                      <th align='left'>Msgs</th>
                      <th align='left'>Memo</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {block.block.data.txs.map((t) => {
                      const hash = hashTx(fromBase64(t));
                      const tx = decodeTxRaw(fromBase64(t));
                      return (
                        <tr key={hash}>
                          <td>
                            <AppLink href={`/tx/${hash}`}>{hash}</AppLink>
                          </td>
                          <td>
                            {getMessages(tx.body.messages)}
                          </td>
                          <td>{tx.body.memo}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table> :
                <div className="text-center">No Transactions</div>
              }
            </div>
          </div>
        </Card.Header>
      </Card>

      <Card elevate size="$4" bordered className='w-full mt-5'>
        <Card.Header padded>
          <H3 className='text-lumera-label'>Last Commit</H3>
          <div className='mt-3'>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Height</div>
              <div className="w-full truncate">
                {block?.block?.last_commit?.height}
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Round</div>
              <div className="w-full truncate">
                {block?.block?.last_commit?.round}
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row border-b border-lumera-navy py-3 px-4'>
              <div className='w-full md:w-52'>Block Id</div>
              <div className="w-full truncate">
                <LastBlockID
                  hash={block?.block?.last_commit?.block_id?.hash || ''}
                  part_set_header={block?.block?.last_commit?.block_id?.part_set_header}
                />
              </div>
            </div>
            <div className='flex items-center flex-col md:flex-row py-3 px-4'>
              <div className='w-full md:w-52'>Signatures</div>
              <div className="overflow-auto max-h-[380px] max-w-full">
                <table className="table w-full">
                  <thead>
                    <tr className='text-sm'>
                      <th align='left'>Block Id Flag</th>
                      <th align='left'>Validator Address	</th>
                      <th align='left'>Timestamp</th>
                      <th align='left'>Signature</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {block?.block?.last_commit?.signatures?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.block_id_flag}</td>
                        <td>{getValidatorName(item.validator_address)}</td>
                        <td className='whitespace-nowrap'>
                          {dayjs(item.timestamp).format('MMMM DD, YYYY')} at {dayjs(item.timestamp).format('hh:mm:ss A')}
                        </td>
                        <td>
                          <HexOutput hash={item.signature} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card.Header>
      </Card>
    </div>
  )
}
