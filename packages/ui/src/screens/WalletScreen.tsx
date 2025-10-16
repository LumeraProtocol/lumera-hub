import React, { useState, Fragment } from 'react';
import { 
    Landmark, 
    XCircle, 
    X, 
    ArrowUpRight, 
    Copy, 
    Coins, 
    Send, 
    ArrowDown, 
    ArrowLeftRight, 
    ArrowDownLeft, 
    Check,
} from 'lucide-react';
import { Transition } from '@headlessui/react';
import ReactPaginate from 'react-paginate';

import Loading from '@/components/Loading';
import PastTime from '@/components/PastTime';
import Card from '@/components/Card';
import ReceiveModal from '@/components/ReceiveModal';
import DelegateModal from '@/components/DelegateModal';
import SendModal from '@/components/SendModal';
import { AccountInfoData } from '@/hooks/useAccountInfo';
import { RATE_VALUE } from '@/hooks/useDeposit';
import { ITransaction } from '@/hooks/useTransaction';
import { formatAddress } from '@/utils/format';
import { getMessages } from '@/utils/helpers';
import { IValidator } from '@/types/validator';

import 'react-paginate/theme/basic/react-paginate.css';

interface IButton {
    children: any; 
    onClick?: any;
    className?: string;
    variant?: string;
}

const Button = ({ children, onClick, className = '', variant = 'primary' }: IButton) => {
  const baseClasses = 'px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';
  const variants: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-700/50',
  };
  return <button onClick={onClick} className={`${baseClasses} ${variants[variant as any]} ${className}`}>{children}</button>;
};

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
            case 'Delegate': 
                return <Landmark className="w-5 h-5 text-indigo-400" />;
            case 'WithdrawDelegatorReward×2': 
                return <Coins className="w-5 h-5 text-amber-400" />;
            case 'Failed': 
                return <XCircle className="w-5 h-5 text-gray-500" />;
            default: 
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
            case 'WithdrawDelegatorReward×2': 
            case 'Received': 
                return 'bg-green-500/20';
            default: 
                return 'bg-red-500/20';
        }
    }

    const getTotalBalances = () => {
        let total = 0;
        if (accountInfo?.balances?.length) {
            for (const item of accountInfo?.balances) {
                if (item.denom === 'ulume') {
                    total += Number(item.amount);
                }
            }
        }
        if (accountInfo?.delegations?.length) {
            for (const item of accountInfo?.delegations) {
                if (item.balance.denom === 'ulume') {
                    total += Number(item.balance.amount);
                }
            }
        }
        
        return total / RATE_VALUE;
    }

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(walletAddress)
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 3000)
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
                availableAmount={getTotalBalances()}
                isVoteLoading={sendOptions.isVoteLoading}
                onAdvancedCheckedChange={sendOptions.onAdvancedCheckedChange}
                onCloseDailogChange={sendOptions.onCloseDailogChange}
                onInputChange={sendOptions.onInputChange}
                onSendClick={sendOptions.onSendClick}
                optionsAdvanced={sendOptions.optionsAdvanced}
                showAdvanced={sendOptions.showAdvanced}
                error={sendOptions.error}
            />
            <DelegateModal
                isOpen={selectedModal === 'stake'}
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

            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <h3 className="font-semibold text-gray-400">Total Wallet Balance</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-white mt-2">{getTotalBalances().toLocaleString()} LUME</p>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button 
                            className="w-full" 
                            onClick={() => onOpenModal('send')}
                        >
                            <Send className="w-5 h-5"/> Send
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="w-full" 
                            onClick={() => onOpenModal('receive')}
                        >
                            <ArrowDown className="w-5 h-5"/> Receive
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="w-full"
                            onClick={() => onOpenModal('stake')}
                        >
                            <Landmark className="w-5 h-5"/> Stake
                        </Button>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-semibold text-gray-400 mb-2">Your Address</h3>
                     <div className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg">
                        <span className="font-mono text-sm text-gray-300 truncate">{walletAddress}</span>
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
                <h2 className="text-xl font-semibold text-white mb-4">Transaction History</h2>
                <div className="space-y-2 relative">
                    <Loading isLoading={isLoading} />
                    {transactions.map((tx) => (
                        <div key={tx.txhash} className="grid grid-cols-12 gap-4 items-center bg-gray-900/40 p-4 rounded-lg hover:bg-gray-800/60 transition-colors">
                            <div className="col-span-2 flex items-center">
                                <div className={`p-2 rounded-full inline-block ${getColor(getMessages(tx.tx.body.messages))}`}>
                                    {getTxIcon(getMessages(tx.tx.body.messages))}
                                </div>
                                <a href={`/block/${tx.height}`} className="font-semibold text-white ml-2">{tx.height}</a>
                            </div>
                            <div className="col-span-4">
                                <a href={`/tx/${tx.txhash}`} className="font-semibold text-white">
                                    {formatAddress(tx.txhash, 20, -6)}
                                </a>
                            </div>
                            <div className="col-span-3 text-left">
                                {getMessages(tx.tx.body.messages)}
                            </div>
                            <div className="col-span-3 text-sm text-gray-500 flex justify-end">
                                <span className="text-white pr-1">{tx.timestamp}</span>
                                (<PastTime pastDate={new Date(tx.timestamp)} className='text-sm' />)
                            </div>
                        </div>
                    ))}
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
