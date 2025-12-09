import { useState } from 'react';
import { H2, Card, Button, H3 } from 'tamagui';
import { ArrowUpRight, Copy, Check } from 'lucide-react';
import { fromHex, toBase64, fromBase64, toHex, fromBech32 } from '@cosmjs/encoding';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import ReactPaginate from 'react-paginate';

import Loading from '@/components/Loading';
import AppLink from '@/components/AppLink';
import DelegateModal from '@/components/DelegateModal';
import useAppRouter from '@/hooks/useAppRouter';
import { IValidator } from '@/types/validator';
import { RATE_VALUE } from '@/contants';
import { TSigningInfos, IBlock, AccountInfoData } from '@/types';
import { formatToken, formatCommissionRate, percent } from '@/utils/format';
import {
  consensusPubkeyToHexAddress,
  valconsToBase64,
  calculatePercent,
  calculateTotalPower,
  stringToUint8Array,
  uint8ArrayToString,
  parseCoins,
  convertUint8ArrayToJson,
} from '@/utils/helpers';
import { DENOM } from '@/contants/network';
import { TEvent } from '@/hooks/useTransactionDetails';
import useLatestBlocks from '@/hooks/useLatestBlocks';
import { LIMIT } from '@/hooks/useValidator';

import 'react-paginate/theme/basic/react-paginate.css';

type TTx = {
  hash: string;
  height: string;
  index: number;
  tx_result: {
    code: number;
    data: string;
    log: string;
    info: string;
    gas_wanted: string;
    gas_used: string;
    events: TEvent[];
    codespace: string;
  };
  tx: string;
}

interface IStakingDetailsScreen {
  validatorAddress: string;
  isLoading: boolean;
  validator: IValidator | null;
  slashingParams: {
    signed_blocks_window: string;
    min_signed_per_window: string;
    downtime_jail_duration: string;
    slash_fraction_double_sign: string;
    slash_fraction_downtime: string;
  };
  signingInfos: TSigningInfos[];
  isFetchParamsLoading: boolean;
  isFetchValidatorsLoading: boolean;
  validators: IValidator[];
  isFetchDelegatorsLoading: boolean;
  delegators: TTx[];
  delegateOptions: {
    isVoteLoading: boolean;
    error: string | null;
    optionsAdvanced: {
        fees: string;
        gas: string;
        memo: string;
        senderAddress: string;
        amount: string;
        validator: string;
    };
    showAdvanced: boolean;
    validators: IValidator[];
    totalValidators: string;
    isLoading: boolean;
    isOpenModal: boolean;
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onCloseDailogChange: () => void;
    onSendClick: () => void;
    onInputChange: (name: string, value: string) => void;
    onAdvancedCheckedChange: (checked: boolean) => void;
    onOpenModal: (validator: string, customMemo?: string) => void;
  };
  accountInfo: AccountInfoData | null;
  totalDelegators: number;
  onPageClick: ({ selected }: { selected: number }) => void;
}

type TDelegatorMessage = {
  typeUrl: string;
  value: Uint8Array;
}

const LatestBlocks = () => {
  const { blocks, validators, isFetchBlockLoading } = useLatestBlocks();
  const { redirect } = useAppRouter();

  const getBlockStatus = (block: IBlock) => {
    const { header } = block;
    if (!validators?.length) {
      return '';
    }

    const txt = toHex(fromBase64(header.proposer_address)).toUpperCase();
    const validator = validators.find(
      (x) => consensusPubkeyToHexAddress(x.consensus_pubkey) === txt ||
      consensusPubkeyToHexAddress(x.consensus_pubkey) === header.proposer_address
    );

    if (validator) {
      return 'signed';
    }

    const decoded = fromBech32(validators[0]?.operator_address);
    const base64Address = toBase64(decoded.data);
    if (header.proposer_address === base64Address) {
      return 'proposed';
    }

    return 'missed';
  }

  const getSumary = () => {
    let signed = 0;
    let proposed = 0;
    let missed = 0;

    for (const block of blocks) {
      const status = getBlockStatus(block);
      switch (status) {
        case 'missed':
          missed += 1;
          break;
        case 'proposed':
          proposed += 1;
          break;
        case 'signed':
          signed += 1;
          break;
      }
    }
    return {
      signed,
      proposed,
      missed,
    };
  }

  const { signed, proposed, missed } = getSumary();

  return (
    <Card bordered className='w-full portfolio-overview mt-5 relative'>
      <Card.Header padded>
      <H3>Last 100 Blocks</H3>
      <div className='mt-3'>
        <ul className='flex gap-8 list-none text-base'>
          <li>
            <span className='inline-block w-3.5 h-3.5 bg-lumera-green rounded-full mr-1'></span> Signed: {signed}
          </li>
          <li>
            <span className='inline-block w-3.5 h-3.5 bg-lumera-blue-light rounded-full mr-1'></span> Proposed: {proposed}
          </li>
          <li>
            <span className='inline-block w-3.5 h-3.5 bg-red-600 rounded-full mr-1'></span> Missed: {missed}
          </li>
        </ul>
        <div className="grid grid-cols-10 md:grid-cols-20 gap-1.5 mt-3 relative">
          <Loading isLoading={isFetchBlockLoading} />
          {blocks?.map((block) => (
            <div
              key={block.last_commit.height}
              onClick={() => redirect(`/block/${block.last_commit.height}`)}
              className={`h-6 rounded cursor-pointer ${getBlockStatus(block) === 'signed' ? 'bg-green-500' : getBlockStatus(block) === 'proposed' ? 'bg-sky-500' : 'bg-red-500'} transition-colors duration-500`} title={`Block ${block.last_commit.height}: ${getBlockStatus(block)}`} />
            ))}
          </div>
      </div>
      </Card.Header>
    </Card>
  );
}

export const StakingDetailsScreen = ({
  validatorAddress,
  isLoading,
  validator,
  slashingParams,
  signingInfos,
  isFetchParamsLoading,
  validators,
  isFetchDelegatorsLoading,
  delegators,
  delegateOptions,
  accountInfo,
  totalDelegators,
  onPageClick,
}: IStakingDetailsScreen) => {
  const [isCopied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(validatorAddress)
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000)
  }

  if (!isLoading && !validator) {
    return (
      <div className="space-y-8">
        <H3 className='text-lumera-label'>Not found</H3>
      </div>
    )
  }

  const getUptime = (validator: IValidator | null) => {
    if (!validator || isFetchParamsLoading) {
      return 0;
    }

    const hex = consensusPubkeyToHexAddress(validator.consensus_pubkey);
    const window = Number(slashingParams.signed_blocks_window || 0);
    const signing = signingInfos.find((item) => {
      return toBase64(fromHex(hex)) === valconsToBase64(item.address)
    });
    return signing && window > 0
      ? (window - Number(signing.missed_blocks_counter)) / window
      : 0
  }

  const uptime = getUptime(validator);
  const uptimePercent = percent(uptime);

  const totalPower = calculateTotalPower(validators);

  const mapDelegators = (messages: TDelegatorMessage[]) => {
    if(!messages) return [];
    const newMessages = messages.map((message) => {
      return ({
        ...convertUint8ArrayToJson(message.value),
      })
    }).filter(x => x && typeof x.delegatorAddress === 'string' && x.delegatorAddress.length > 0);
    return Array.from(new Set(newMessages.map(x => x.delegatorAddress)));
  }

  const mapEvents = (events: {type: string, attributes: {key: string, value: string}[]}[], withDenom = true, fmt = '0,0.[0]') => {
    const attributes = events
      .filter(x => x.type === 'delegate')
      .filter(x => x.attributes.findIndex(attr => attr.value === validatorAddress || attr.value === toBase64(stringToUint8Array(validatorAddress))) > -1)
      .map(x => {
        // check if attributes need to decode
        const output = {} as {[key: string]: string }

        if (x.attributes.findIndex(a => a.key === `amount`) > -1) {
          x.attributes.forEach(attr => {
            output[attr.key] = attr.value
          })
        } else {
          x.attributes.forEach(attr => {
            output[uint8ArrayToString(fromBase64(attr.key))] = uint8ArrayToString(fromBase64(attr.value))
          })
        };

        return output;
      });

    const coinsAsString = attributes.map((x: any) => x.amount).join(',');
    const coins = parseCoins(coinsAsString);

    return coins.map(coin => formatToken(coin, withDenom, fmt)).join(', ');
  }

  const getStakeShare = (item: TTx) => {
    const value = mapEvents(item.tx_result.events, false, '0,0.[000]');
    const percentValue = Number(value.replaceAll(',', '')) * 100 / totalPower;
    return parseFloat(percentValue.toFixed(7)) > 0 ? `${percentValue.toFixed(7)}%` : '0%';
  }

  const getTotalBalances = () => {
    let total = 0;
    if (accountInfo?.balances?.length) {
      for (const item of accountInfo?.balances) {
        if (item.denom === DENOM) {
          total += Number(item.amount);
        }
        if (item.denom === 'lume') {
          total += Number(item.amount) * RATE_VALUE;
        }
      }
    }
    return total / RATE_VALUE;
  }

  const totalPages = Math.ceil(totalDelegators / LIMIT);

  return (
    <div className="space-y-8">
      <div className='flex justify-between gap-5 w-full items-center flex-wrap sm:flex-nowrap'>
        <H2 className='!font-bold text-white text-[32px] leading-none'>{validator?.description?.moniker}</H2>
        <div className='btn-primary'>
          <Button
            onPress={() => delegateOptions.onOpenModal(validator?.operator_address || '', validator?.description?.moniker ? `Delegate for the ${validator?.description?.moniker}` : '')}
          >
            <span className='font-bold whitespace-nowrap'>Delegate</span>
          </Button>
        </div>
      </div>
      <div className='flex justify-between gap-5 mt-5 w-full flex-col 2lg:flex-row'>
        <div className='w-full 2lg:w-2/3'>
          <Card bordered className='w-full portfolio-overview'>
            <Card.Header padded>
              <H3>Description</H3>
              <div className='mt-3 text-lumera-label text-base'>
                {validator?.description?.details}
              </div>
            </Card.Header>
          </Card>
          <LatestBlocks />
        </div>
        <div className='w-full 2lg:w-1/3'>
          <Card bordered className='w-full portfolio-overview'>
            <Card.Header padded>
            <H3>Details</H3>
            <div className='mt-3 text-base'>
              <div className='flex justify-between items-center gap-4 w-full'>
                <span className='text-lumera-label'>Website</span>
                <a href={validator?.description?.website} target='_blank' rel='noopener noreferrer' className='text-lumera-label hover:text-lumera-teal flex gap-0.5 items-center truncate'>
                  <span>{validator?.description?.website?.split('://')[1]}</span> <ArrowUpRight className="w-3 h-3"/>
                </a>
              </div>
              <div className='flex justify-between items-center gap-4 w-full mt-4'>
                <span className='text-lumera-label'>Security Contact</span>
                <a href={`mailto:${validator?.description?.security_contact}`} className='text-lumera-label hover:text-lumera-teal flex gap-0.5 items-center'>
                  {validator?.description?.security_contact}
                </a>
              </div>
              <div className='w-full mt-4'>
                <span className='text-lumera-label'>Wallet Address</span>
                <div className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg mt-2">
                  <span className="font-mono text-sm text-gray-300 truncate">{validatorAddress}</span>
                  <button onClick={handleCopyAddress} className="ml-auto p-1 text-gray-400 hover:text-white transition-colors">
                      {!isCopied ?
                        <Copy className="w-4 h-4"/> :
                        <Check className="w-4 h-4"/>
                      }
                  </button>
                </div>
              </div>
            </div>
            </Card.Header>
          </Card>
          <Card bordered className='w-full portfolio-overview mt-5'>
            <Card.Header padded>
              <H3>Statistics</H3>
              <div className='mt-3 text-base'>
                <div className='flex justify-between items-center gap-4 w-full'>
                  <span className='text-lumera-label'>Total Staked</span>
                  <a href='#' target='_blank' rel='noopener noreferrer' className='text-white flex gap-0.5 items-center'>
                    {formatToken({
                      amount: `${validator?.tokens}`,
                      denom: DENOM,
                    }, true, '0,0.[00]')}
                  </a>
                </div>
                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                  <span className='text-lumera-label'>Commission</span>
                  <span className='text-white flex gap-0.5 items-center'>
                    {formatCommissionRate(validator?.commission?.commission_rates?.rate)}
                  </span>
                </div>
                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                  <span className='text-lumera-label'>Voting Power</span>
                  <span className='text-white flex gap-0.5 items-center'>
                    {calculatePercent(validator?.delegator_shares, totalPower)}
                  </span>
                </div>
                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                  <span className='text-lumera-label'>Uptime</span>
                  <span className='text-lumera-green flex gap-0.5 items-center'>
                    {uptimePercent}
                  </span>
                </div>
                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                  <span className='text-lumera-label'>Status</span>
                  <span className='text-lumera-green-light flex gap-0.5 items-center'>
                    {validator?.status?.replace('BOND_STATUS_', '')}
                  </span>
                </div>
              </div>
            </Card.Header>
          </Card>
        </div>
      </div>
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <H3>Delegators ({ totalDelegators })</H3>
          <div className='mt-3 relative'>
            <Loading isLoading={isFetchDelegatorsLoading} />
            <div className="overflow-x-auto">
              <div className="md:min-w-[500px] space-y-2">
                <div className="hidden md:grid grid-cols-10 gap-4 px-4 py-3 text-sm font-semibold text-gray-400">
                  <div className="col-span-5">Delegator Address</div>
                  <div className="col-span-2 text-right">Stake Share</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>
                {delegators.map((item, i) => {
                  const tx = decodeTxRaw(fromBase64(item.tx));
                  return (
                    <div key={i} className="flex flex-col md:grid grid-cols-10 gap-2 md:gap-4 p-3 bg-gray-900/40 rounded-lg text-sm">
                      <div className="w-full md:col-span-5 font-mono text-gray-300 truncate">
                        <div className="md:hidden font-semibold text-gray-500 mr-2">Delegator Address: </div>
                        {mapDelegators(tx?.body?.messages).map((d) => (
                          <AppLink href={`/account/${d}`} key={d}>
                            {d}
                          </AppLink>
                        ))}
                      </div>
                      <div className="w-full md:col-span-2 md:text-right text-indigo-400">
                        <div className="md:hidden font-semibold text-gray-500 mr-2">Stake Share: </div>
                        <span>{getStakeShare(item)}</span>
                      </div>
                      <div className="w-full md:col-span-3 md:text-right font-mono text-white">
                        <div className="md:hidden font-semibold text-gray-500 mr-2">Amount: </div>
                        <span>{mapEvents(item.tx_result.events)}</span>
                      </div>
                    </div>
                  )
                })}
                {delegators?.length <= 0 ?
                  <div>No delegators</div> : null
                }

              </div>
            </div>
            {totalPages > 1 ?
              <div className="flex justify-end w-full paginate-wrapper mt-3">
                <ReactPaginate
                  breakLabel="..."
                  nextLabel=">"
                  onPageChange={onPageClick}
                  pageRangeDisplayed={2}
                  marginPagesDisplayed={1}
                  pageCount={totalPages}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  className='react-paginate'
                />
              </div> : null
            }
          </div>
        </Card.Header>
      </Card>
      <DelegateModal
        isOpen={delegateOptions.isOpenModal}
        availableAmount={getTotalBalances()}
        isVoteLoading={delegateOptions.isVoteLoading}
        onAdvancedCheckedChange={delegateOptions.onAdvancedCheckedChange}
        onCloseDailogChange={delegateOptions.onCloseDailogChange}
        onInputChange={delegateOptions.onInputChange}
        onSendClick={delegateOptions.onSendClick}
        optionsAdvanced={delegateOptions.optionsAdvanced}
        showAdvanced={delegateOptions.showAdvanced}
        error={delegateOptions.error}
        validators={delegateOptions.validators}
        transactionHash={delegateOptions.transactionHash}
        onCloseCongratulationsModal={delegateOptions.onCloseCongratulationsModal}
      />
    </div>
  )
}
