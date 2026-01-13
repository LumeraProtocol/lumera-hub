import { useState } from 'react';
import {
  XCircle,
  ArrowUpRight,
  Copy,
  Coins,
  Send,
  ArrowDown,
  ArrowLeftRight,
  ArrowDownLeft,
  Check,
  Layers,
  ClockPlus,
  Unlink,
  Star,
} from 'lucide-react';
import { YStack, H2, Paragraph, Card as TamaguiCard, H3 } from 'tamagui';
import ReactPaginate from 'react-paginate';
import dayjs from 'dayjs';
import { Wallet } from '@tamagui/lucide-icons';
import { toast } from 'react-toastify';

import AppLink from '@/components/AppLink';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import Loading from '@/components/Loading';
import PastTime from '@/components/PastTime';
import Card from '@/components/Card';
import ReceiveModal from '@/components/ReceiveModal';
import DelegateModal from '@/components/DelegateModal';
import SendModal from '@/components/SendModal';
import Skeleton from '@/components/Skeleton';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { AccountInfoData } from '@/hooks/useAccountInfo';
import { RATE_VALUE } from '@/contants';
import { ITransaction } from '@/hooks/useTransaction';
import { formatAddress, formatTokenDisplay } from '@/utils/format';
import { getMessages } from '@/utils/helpers';
import { IValidator } from '@/types/validator';
import { DENOM } from '@/contants/network';

import 'react-paginate/theme/basic/react-paginate.css';

interface IWalletScreen {
    walletAddress: string;
    accountInfo: AccountInfoData | null;
    isLoading: boolean;
    error: string;
    transactions: ITransaction[];
    totalTransactions: number;
    selectedModal: string;
    handlePageClick: ({ selected }: { selected: number }) => void;
    onOpenModal: (modal: string) => void;
    onCloseModal: () => void;
    sendOptions: {
        isVoteLoading: boolean;
        error: string | null;
        optionsAdvanced: {
            fees: string;
            gas: string;
            memo: string;
            senderAddress: string;
            amount: string;
            recipient: string;
            balances: string;
        };
        showAdvanced: boolean;
        transactionHash?: string;
        onCloseCongratulationsModal?: () => void;
        onCloseDailogChange: () => void;
        onSendClick: () => void;
        onInputChange: (name: string, value: string) => void;
        onAdvancedCheckedChange: (checked: boolean) => void;
    };
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
        transactionHash?: string;
        onCloseCongratulationsModal?: () => void;
        onCloseDailogChange: () => void;
        onSendClick: () => void;
        onInputChange: (name: string, value: string) => void;
        onAdvancedCheckedChange: (checked: boolean) => void;
    }
}

export const WalletScreen = ({
    walletAddress,
    accountInfo,
    isLoading,
    error,
    transactions,
    totalTransactions,
    selectedModal,
    sendOptions,
    delegateOptions,
    handlePageClick,
    onOpenModal,
    onCloseModal,
}: IWalletScreen) => {
  const [isCopied, setCopied] = useState(false);

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
      if (accountInfo?.delegations?.length) {
        for (const item of accountInfo?.delegations) {
          if (item.balance.denom === DENOM) {
            total += Number(item.balance.amount);
          }
          if (item.balance.denom === 'lume') {
            total += Number(item.balance.amount) * RATE_VALUE;
          }
        }
      }

      return total;
    }

    const getAvailableBalances = () => {
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

      return total;
    }

    const getDelegations = () => {
      let total = 0;
      if (accountInfo?.delegations?.length) {
        for (const item of accountInfo?.delegations) {
          if (item.balance.denom === DENOM) {
            total += Number(item.balance.amount);
          }
          if (item.balance.denom === 'lume') {
            total += Number(item.balance.amount) * RATE_VALUE;
          }
        }
      }

      return total;
    }

    const getRewards = () => {
      let total = 0;
      if (accountInfo?.rewards?.length) {
        for (const item of accountInfo?.rewards) {
          for (const reward of item.reward) {
            if (reward.denom === DENOM) {
              total += Number(reward.amount);
            }
            if (reward.denom === 'lume') {
              total += Number(reward.amount) * RATE_VALUE;
            }
          }
        }
      }

      return total;
    }

    const getUnbonding = () => {
      let total = 0;
      if (accountInfo?.unbonding?.length) {
        for (const item of accountInfo?.unbonding) {
          for (const reward of item.entries) {
            total += Number(reward.balance);
          }
        }
      }

      return total;
    }

    const handleCopyAddress = () => {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 3000);
      toast('The address has been copied.', {
        position: "bottom-center",
        theme: "dark",
      });
    }

    const handleCopyAddress2 = () => {
      navigator.clipboard.writeText(walletAddress)
      toast('The address has been copied.', {
        position: "bottom-center",
        theme: "dark",
      });
    }

    if (!walletAddress) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
          <TamaguiCard elevate size="$4" bordered className='w-full'>
            <div className='flex flex-col items-center justify-center min-h-[80vh]'>
              <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
                <Wallet size="$3" />
              </div>
              <h2 className='font-normal text-white text-[42px] leading-[52px] mt-5'>Connect Your Wallet</h2>
              <p className='text-sm font-normal text-lumera-gray mt-3 mx-auto max-w-[400px] text-center'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</p>
              <div className='text-center mt-4'>
                <ConnectWalletButton />
              </div>
          </div>
          </TamaguiCard>
        </YStack>
      );
    }

    return (
      <div className="space-y-8">
        <ReceiveModal
          isOpen={selectedModal === 'receive'}
          onClose={onCloseModal}
          walletAddress={walletAddress}
        />
        <SendModal
          isOpen={selectedModal === 'send'}
          availableAmount={getAvailableBalances() / RATE_VALUE}
          isVoteLoading={sendOptions.isVoteLoading}
          onAdvancedCheckedChange={sendOptions.onAdvancedCheckedChange}
          onCloseDailogChange={sendOptions.onCloseDailogChange}
          onInputChange={sendOptions.onInputChange}
          onSendClick={sendOptions.onSendClick}
          optionsAdvanced={sendOptions.optionsAdvanced}
          showAdvanced={sendOptions.showAdvanced}
          error={sendOptions.error}
          transactionHash={sendOptions.transactionHash}
          onCloseCongratulationsModal={sendOptions.onCloseCongratulationsModal}
        />
        <DelegateModal
          isOpen={selectedModal === 'stake'}
          availableAmount={getAvailableBalances() / RATE_VALUE}
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
        <div className="flex justify-between gap-8 flex-col lg:flex-row">
          <Card className='w-full lg:w-2/3'>
            <SectionTitle className="mb-0">Total Wallet Balance</SectionTitle>
            <div className='w-full flex justify-between'>
              <p className="text-3xl sm:text-4xl xl:text-5xl font-bold text-white mt-2">
                {isLoading ?
                  <Skeleton /> : <>
                    {formatTokenDisplay({
                    amount: `${getTotalBalances()}`,
                    denom: DENOM,
                    }, false, '0,0.[00000]')} <span className='text-xl sm:text-2xl'>LUME</span>
                  </>
                }
              </p>
            </div>
            <ul className='text-sm flex justify-between flex-wrap gap-x-4 gap-y-1 text-lumera-label mt-2'>
              <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Available: </span>
                {formatTokenDisplay({
                  amount: `${getAvailableBalances()}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li>
              <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Staking: </span>
                  {formatTokenDisplay({
                  amount: `${getDelegations()}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li>
              <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Rewards: </span>
                {formatTokenDisplay({
                  amount: `${getRewards()}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li>
              <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Unstaking: </span>
                {formatTokenDisplay({
                  amount: `${getUnbonding()}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li>
            </ul>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className='btn-primary'>
                <AppButton
                  className="w-full cursor-pointer"
                  onClick={() => onOpenModal('send')}
                  disabled={isLoading}
                >
                  <Send className="w-5 h-5"/> Send
                </AppButton>
              </div>
                <AppButton
                  variant="secondary"
                  className="w-full cursor-pointer"
                  onClick={() => onOpenModal('receive')}
                  disabled={isLoading}
                >
                  <ArrowDown className="w-5 h-5"/> Receive
                </AppButton>
                <AppButton
                    variant="secondary"
                  className="w-full cursor-pointer"
                  onClick={() => onOpenModal('stake')}
                  disabled={isLoading}
                >
                  <Layers className="w-5 h-5"/> Stake
                </AppButton>
            </div>
          </Card>
          <Card className='w-full lg:w-1/3'>
            <SectionTitle className="mb-2">Your Address</SectionTitle>
            <div className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg">
              <span className="font-mono text-sm text-gray-300 truncate cursor-pointer" onClick={handleCopyAddress2}>{walletAddress}</span>
              <button onClick={handleCopyAddress} className="ml-auto p-1 text-gray-400 hover:text-white transition-colors">
                {!isCopied ?
                  <Copy className="w-4 h-4"/> :
                  <Check className="w-4 h-4"/>
                }
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">This is your unique address. Use it to receive LUME and other assets.</p>
          </Card>
        </div>

        <Card>
          <SectionTitle className="mb-4">Transaction History</SectionTitle>
          <div className="space-y-2 relative w-full">
            <Loading isLoading={isLoading} />
            <div className='w-full overflow-x-auto'>
              <div className='w-full md:min-w-[968px] text-base'>
                <div className="hidden md:grid grid-cols-12 gap-4 items-center p-4 text-gray-400 text-sm">
                  <div className="col-span-2 flex items-center">
                    Block Height
                  </div>
                  <div className="col-span-2">
                    TX Hash
                  </div>
                  <div className="col-span-3 text-left whitespace-nowrap">
                    Transaction Type
                  </div>
                  <div className="col-span-2 text-left whitespace-nowrap">
                    Transaction Status
                  </div>
                  <div className="col-span-3 flex justify-end">
                    Time
                  </div>
                </div>
                {transactions.map((tx) => (
                  <div key={tx.txhash} className="md:grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg hover:bg-gray-800/60 transition-colors mb-3 md:mb-0 text-base">
                    <div className="w-full md:col-span-2">
                      <div className="md:hidden font-semibold text-gray-500 mr-2">Block Height: </div>
                      <div className='flex items-center mt-1 md:mt-0'>
                        <div className={`p-2 rounded-full inline-block ${getColor(getMessages(tx.tx.body.messages))}`}>
                          {getTxIcon(getMessages(tx.tx.body.messages))}
                        </div>
                        <AppLink href={`/block/${tx.height}`} className="text-white ml-2 hover:text-lumera-green">{tx.height}</AppLink>
                      </div>
                    </div>
                    <div className="w-full md:col-span-2 mt-3 md:mt-0">
                      <div className="md:hidden font-semibold text-gray-500 mr-2">TX Hash: </div>
                      <AppLink href={`/tx/${tx.txhash}`} className="text-white whitespace-nowrap hover:text-lumera-green">
                        {formatAddress(tx.txhash, 10, -4)}
                      </AppLink>
                    </div>
                    <div className="w-full md:col-span-3 text-left whitespace-nowrap mt-3 md:mt-0">
                      <div className="md:hidden font-semibold text-gray-500 mr-2">Transaction Type: </div>
                      {getMessages(tx.tx.body.messages)}
                    </div>
                    <div className="w-full md:col-span-2 text-left whitespace-nowrap mt-3 md:mt-0">
                      <div className="md:hidden font-semibold text-gray-500 mr-2">Transaction Status: </div>
                      <span className={`truncate relative w-fit rounded ${tx?.code === 0 ? 'text-lumera-teal' : 'text-red-500'}`}>
                        {tx?.code === 0 ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <div className="w-full md:col-span-3 text-sm text-gray-500 md:flex justify-end mt-3 md:mt-0">
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
        </Card>
      </div>
    );
};
