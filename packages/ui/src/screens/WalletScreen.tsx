import { useState } from 'react';
import {
  Copy,
  Send,
  ArrowDown,
  Check,
  Layers,
} from 'lucide-react';
import { YStack, H2, Paragraph, Card as TamaguiCard } from 'tamagui';
import { Wallet } from '@tamagui/lucide-icons';
import { toast } from 'react-toastify';

import { ConnectWalletButton } from '@/components/ConnectWallet';
import Card from '@/components/Card';
import ReceiveModal from '@/components/ReceiveModal';
import DelegateModal from '@/components/DelegateModal';
import SendModal from '@/components/SendModal';
import Skeleton from '@/components/Skeleton';
import AppButton from '@/components/AppButton';
import TransactionHistory from '@/components/TransactionHistory';
import { AccountInfoData } from '@/hooks/useAccountInfo';
import { RATE_VALUE } from '@/contants';
import { ITransaction } from '@/hooks/useTransaction';
import { formatTokenDisplay } from '@/utils/format';
import { IValidator } from '@/types/validator';
import { DENOM } from '@/contants/network';
import {
  getAvailableBalances,
  getDelegations,
  getRewards,
  getUnbonding,
  getTotalBalances,
} from '@/utils/portfolio';

interface IWalletScreen {
    walletAddress: string;
    bech32Address: string;
    ethAddress: string;
    isEvm: boolean;
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
    bech32Address,
    ethAddress,
    isEvm,
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
  const [copiedAddress, setCopiedAddress] = useState('');

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

    if (!walletAddress) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
          <TamaguiCard elevate size="$4" bordered className='w-full'>
            <div className='flex flex-col items-center justify-center min-h-[80vh]'>
              <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
                <Wallet size="$3" />
              </div>
              <H2 className='font-bold text-white text-[32px] leading-none !mt-5 text-center'>Connect Your Wallet</H2>
              <Paragraph className='text-base text-lumera-gray mx-auto max-w-[400px] text-center !mt-3'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</Paragraph>
              <div className='text-center mt-4'>
                <ConnectWalletButton />
              </div>
          </div>
          </TamaguiCard>
        </YStack>
      );
    }

    const hasEvmAddressFormats = Boolean(ethAddress);
    const displayedAddresses = hasEvmAddressFormats
      ? [
        { label: 'Bech32 address', value: bech32Address },
        { label: 'ETH hex address', value: ethAddress },
      ]
      : [{ label: 'Bech32 address', value: bech32Address || walletAddress }];

    return (
      <div className="space-y-8">
        <ReceiveModal
          isOpen={selectedModal === 'receive'}
          onClose={onCloseModal}
          walletAddress={walletAddress}
        />
        <SendModal
          isEvm={isEvm}
          isOpen={selectedModal === 'send'}
          availableAmount={getAvailableBalances(accountInfo) / RATE_VALUE}
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
        {!isEvm ? (
          <DelegateModal
            isOpen={selectedModal === 'stake'}
            availableAmount={getAvailableBalances(accountInfo) / RATE_VALUE}
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
        ) : null}
        <div className="flex justify-between gap-8 flex-col xl:flex-row">
          <Card className='w-full xl:flex-1'>
            <h3 className="font-semibold text-gray-400">Total Wallet Balance</h3>
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
                <span className='inline-block'></span> <span>Available: </span>
                {formatTokenDisplay({
                  amount: `${getAvailableBalances(accountInfo)}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li>
              {!isEvm ? <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Staking: </span>
                  {formatTokenDisplay({
                  amount: `${getDelegations(accountInfo)}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li> : null}
              {!isEvm ? <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Rewards: </span>
                {formatTokenDisplay({
                  amount: `${getRewards(accountInfo)}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li> : null}
              {!isEvm ? <li className='w-full sm:w-[48%] lg:w-full 2lg:w-[48%]'>
                <span className='inline-block'></span> <span>Unstaking: </span>
                {formatTokenDisplay({
                  amount: `${getUnbonding(accountInfo)}`,
                  denom: DENOM,
                  }, false, '0,0.[00000]')} <span className='text-[11px]'>LUME</span>
              </li> : null}
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
                {!isEvm ? <AppButton
                    variant="secondary"
                  className="w-full cursor-pointer"
                  onClick={() => onOpenModal('stake')}
                  disabled={isLoading}
                >
                  <Layers className="w-5 h-5"/> Stake
                </AppButton> : null}
            </div>
          </Card>
          <Card className='w-full xl:w-96 xl:shrink-0'>
            <h3 className="font-semibold text-gray-400 mb-2">{hasEvmAddressFormats ? 'Your Addresses' : 'Your Address'}</h3>
            <div className="grid gap-2">
              {displayedAddresses.filter(({ value }) => value).map(({ label, value }) => (
                <div className="flex items-start gap-2 bg-gray-900/50 p-3 rounded-lg" key={label}>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left cursor-pointer"
                    aria-label={`Copy ${label}`}
                    onClick={() => void handleCopyAddress(value, label)}
                  >
                    {hasEvmAddressFormats ? (
                      <span className="block mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {label}
                      </span>
                    ) : null}
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
              {hasEvmAddressFormats
                ? 'These formats identify the same account. Click either address to copy it.'
                : 'This is your unique address. Use it to receive LUME and other assets.'}
            </p>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Transaction History</h2>
          <TransactionHistory
            transactions={transactions}
            totalTransactions={totalTransactions}
            isLoading={isLoading}
            handlePageClick={handlePageClick}
          />
        </Card>
      </div>
    );
};
