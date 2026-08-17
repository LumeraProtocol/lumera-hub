import { useState } from 'react';
import { Copy, Check, SearchX } from 'lucide-react';
import { YStack, H2, Paragraph, Card as TamaguiCard } from 'tamagui';
import { toast } from 'react-toastify';

import Card from '@/components/Card';
import AppLink from '@/components/AppLink';
import Skeleton from '@/components/Skeleton';
import TransactionHistory from '@/components/TransactionHistory';
import { AccountInfoData } from '@/hooks/useAccountInfo';
import { ITransaction } from '@/hooks/useTransaction';
import { formatTokenDisplay } from '@/utils/format';
import { DENOM } from '@/contants/network';
import {
  getAvailableBalances,
  getDelegations,
  getRewards,
  getUnbonding,
  getTotalBalances,
} from '@/utils/portfolio';

interface ITransactionList {
  transactions: ITransaction[];
  totalTransactions: number;
  isLoading: boolean;
  error: string;
  handlePageClick: ({ selected }: { selected: number }) => void;
}

interface IAccountScreen {
  bech32Address: string;
  ethAddress: string;
  isValidAddress: boolean;
  accountInfo: AccountInfoData | null;
  isLoading: boolean;
  error: string;
  sentTransactions: ITransactionList;
  receivedTransactions: ITransactionList;
}

export const AccountScreen = ({
  bech32Address,
  ethAddress,
  isValidAddress,
  accountInfo,
  isLoading,
  error,
  sentTransactions,
  receivedTransactions,
}: IAccountScreen) => {
  const [copiedAddress, setCopiedAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

  const handleCopyAddress = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => {
        setCopiedAddress((currentAddress) => currentAddress === address ? '' : currentAddress);
      }, 3000);
      toast(`${label} copied.`, {
        position: "bottom-center",
        theme: "dark",
      });
    } catch {
      toast.error('Unable to copy the address.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
  }

  if (!isValidAddress) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
        <TamaguiCard elevate size="$4" bordered className='w-full'>
          <div className='flex flex-col items-center justify-center min-h-[80vh]'>
            <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
              <SearchX />
            </div>
            <H2 className='font-bold text-white text-[32px] leading-none !mt-5 text-center'>Invalid Account Address</H2>
            <Paragraph className='text-base text-lumera-gray mx-auto max-w-[400px] text-center !mt-3'>The address in the URL is not a valid Lumera account address.</Paragraph>
          </div>
        </TamaguiCard>
      </YStack>
    );
  }

  const displayedAddresses = [
    { label: 'Bech32 address', value: bech32Address },
    { label: 'ETH hex address', value: ethAddress },
  ];
  const activeTransactions = activeTab === 'sent' ? sentTransactions : receivedTransactions;

  return (
    <div className="space-y-8">
      <div className="flex justify-between gap-8 flex-col xl:flex-row">
        <Card className='w-full xl:flex-1'>
          <h3 className="font-semibold text-gray-400">Total Balance</h3>
          <div className='w-full flex justify-between'>
            <p className="text-3xl sm:text-4xl xl:text-5xl font-bold text-white mt-2">
              {isLoading ?
                <Skeleton /> : <>
                  {formatTokenDisplay({
                  amount: `${getTotalBalances(accountInfo)}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-xl sm:text-2xl'>LUME</span>
                </>
              }
            </p>
          </div>
          {error && !isLoading ? (
            <p className='text-sm text-lumera-red-light mt-2'>{error}</p>
          ) : null}
          <ul className='text-sm flex justify-between flex-wrap gap-x-4 gap-y-1 text-lumera-label mt-2'>
            <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
              <span>Available: </span>
              {formatTokenDisplay({
                amount: `${getAvailableBalances(accountInfo)}`,
                denom: DENOM,
                }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
            </li>
            <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
              <span>Staking: </span>
              {formatTokenDisplay({
                amount: `${getDelegations(accountInfo)}`,
                denom: DENOM,
                }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
            </li>
            <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
              <span>Rewards: </span>
              {formatTokenDisplay({
                amount: `${getRewards(accountInfo)}`,
                denom: DENOM,
                }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
            </li>
            <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
              <span>Unstaking: </span>
              {formatTokenDisplay({
                amount: `${getUnbonding(accountInfo)}`,
                denom: DENOM,
                }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
            </li>
          </ul>
        </Card>
        <Card className='w-full xl:w-96 xl:shrink-0'>
          <h3 className="font-semibold text-gray-400 mb-2">Addresses</h3>
          <div className="grid gap-2">
            {displayedAddresses.filter(({ value }) => value).map(({ label, value }) => (
              <div className="flex items-start gap-2 bg-gray-900/50 p-3 rounded-lg" key={label}>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left cursor-pointer"
                  aria-label={`Copy ${label}`}
                  onClick={() => void handleCopyAddress(value, label)}
                >
                  <span className="block mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </span>
                  <span className="block font-mono text-xs leading-5 text-gray-300 break-all whitespace-normal">
                    {value}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Copy ${label}`}
                  onClick={() => void handleCopyAddress(value, label)}
                  className="shrink-0 p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedAddress === value ?
                    <Check className="w-4 h-4"/> :
                    <Copy className="w-4 h-4"/>
                  }
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            These formats identify the same account. Click either address to copy it.
          </p>
        </Card>
      </div>

      {accountInfo?.delegations?.length ? (
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Delegations</h2>
          <div className='w-full overflow-x-auto'>
            <div className='w-full md:min-w-[40rem] text-base'>
              <div className="hidden md:grid md:grid-cols-[minmax(20rem,1fr)_12rem] gap-3 items-center p-4">
                <div className="text-gray-500">Validator</div>
                <div className="text-gray-500 text-right">Amount</div>
              </div>
              {accountInfo.delegations.map((item) => (
                <div key={item.delegation.validator_address} className="md:grid md:grid-cols-[minmax(20rem,1fr)_12rem] gap-3 items-center bg-gray-900/40 p-4 rounded-lg hover:bg-gray-800/60 transition-colors mb-3 md:mb-0">
                  <div className="w-full min-w-0">
                    <div className="md:hidden font-semibold text-gray-500 mr-2">Validator: </div>
                    <AppLink
                      href={`/staking/${item.delegation.validator_address}`}
                      className="block overflow-hidden text-ellipsis text-sm text-white whitespace-nowrap hover:text-lumera-green"
                    >
                      {item.delegation.validator_address}
                    </AppLink>
                  </div>
                  <div className="w-full md:text-right mt-3 md:mt-0">
                    <div className="md:hidden font-semibold text-gray-500 mr-2">Amount: </div>
                    <span className="text-white whitespace-nowrap">
                      {formatTokenDisplay(item.balance, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Transactions</h2>
        <ul className='tabs mb-4'>
          <li className={`tab-item ${activeTab === 'sent' ? 'active' : ''}`}>
            <button className='tab-button' onClick={() => setActiveTab('sent')}>Sent</button>
          </li>
          <li className={`tab-item ${activeTab === 'received' ? 'active' : ''}`}>
            <button className='tab-button' onClick={() => setActiveTab('received')}>Received</button>
          </li>
        </ul>
        {activeTransactions.error && !activeTransactions.isLoading ? (
          <p className='text-sm text-lumera-red-light mb-3'>{activeTransactions.error}</p>
        ) : null}
        <TransactionHistory
          transactions={activeTransactions.transactions}
          totalTransactions={activeTransactions.totalTransactions}
          isLoading={activeTransactions.isLoading}
          handlePageClick={activeTransactions.handlePageClick}
          bech32Address={bech32Address}
          ethAddress={ethAddress}
        />
      </Card>
    </div>
  );
};
