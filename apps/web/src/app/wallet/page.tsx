// apps/web/src/app/wallet/page.tsx
'use client'
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import { WalletScreen } from '@lumera-hub/ui/src/screens/WalletScreen'
import useAccountInfo from '@/hooks/useAccountInfo';
import useWalletConnect from '@/hooks/useWalletConnect';
import useTransaction from '@/hooks/useTransaction';
import useDelegate from '@/hooks/useDelegate';
import useSend from '@/hooks/useSend';
import { hasEthereumTransactionHash } from '@/utils/transaction-history';

const EVM_HISTORY_REFRESH_DELAYS = [0, 2_000, 5_000, 10_000, 20_000];

export default function Page() {
  const [submittedEvmTransactionHash, setSubmittedEvmTransactionHash] = useState('');
  const { address, bech32Address, ethAddress, isEvm } = useWalletConnect();
  const account = useAccountInfo();
  const {
    accountInfo,
    selectedModal,
    handleOpenModal,
    handleCloseModal,
  } = account;
  const {
    isLoading: isTransactionLoading,
    error: transactionError,
    transactions,
    totalTransactions,
    handlePageClick,
    refreshTransactions,
  } = useTransaction();
  const sendOptions = useSend({
    callback: (transactionHash) => {
      if (!isEvm) {
        handleCloseModal();
        return;
      }
      void account.fetchData();
      setSubmittedEvmTransactionHash(transactionHash || '');
    },
    customMemo: '',
  });
  const delegate = useDelegate();
  useEffect(() => {
    document.title = 'Wallet - Lumera Hub';
  }, []);

  useEffect(() => {
    if (!submittedEvmTransactionHash) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const refresh = async (attempt: number) => {
      const refreshedTransactions = await refreshTransactions();
      if (cancelled) return;

      if (hasEthereumTransactionHash(refreshedTransactions, submittedEvmTransactionHash)) {
        setSubmittedEvmTransactionHash('');
        return;
      }

      const nextAttempt = attempt + 1;
      if (nextAttempt < EVM_HISTORY_REFRESH_DELAYS.length) {
        timeout = setTimeout(
          () => void refresh(nextAttempt),
          EVM_HISTORY_REFRESH_DELAYS[nextAttempt],
        );
      }
    };

    timeout = setTimeout(() => void refresh(0), EVM_HISTORY_REFRESH_DELAYS[0]);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [refreshTransactions, submittedEvmTransactionHash]);

  return (
    <>
      <Helmet>
        <title>Wallet - Lumera Hub</title>
      </Helmet>
      <div className="governance-content">
        <WalletScreen
          walletAddress={address}
          bech32Address={bech32Address}
          ethAddress={ethAddress}
          isEvm={isEvm}
          accountInfo={accountInfo}
          isLoading={account.loading || isTransactionLoading}
          error={account.error?.message || transactionError}
          transactions={transactions}
          totalTransactions={totalTransactions}
          selectedModal={selectedModal}
          handlePageClick={handlePageClick}
          onOpenModal={handleOpenModal}
          onCloseModal={handleCloseModal}
          sendOptions={{
            isVoteLoading: sendOptions.isLoading,
            error: sendOptions.error,
            optionsAdvanced: sendOptions.optionsAdvanced,
            showAdvanced: sendOptions.showAdvanced,
            onCloseDailogChange: handleCloseModal,
            onSendClick: sendOptions.handleSendClick,
            onInputChange: sendOptions.handleInputChange,
            onAdvancedCheckedChange: sendOptions.handleShowAdvancedChange,
            transactionHash: sendOptions.transactionHash,
            onCloseCongratulationsModal: () => {
              sendOptions.handleCloseCongratulationsModal();
              handleCloseModal();
            },
          }}
          delegateOptions={{
            isVoteLoading: delegate.isLoading,
            error: delegate.error,
            optionsAdvanced: delegate.optionsAdvanced,
            showAdvanced: delegate.showAdvanced,
            validators: delegate.validators,
            transactionHash: delegate.transactionHash,
            onCloseCongratulationsModal: delegate.handleCloseCongratulationsModal,
            onCloseDailogChange: handleCloseModal,
            onSendClick: delegate.handleSendClick,
            onInputChange: delegate.handleInputChange,
            onAdvancedCheckedChange: delegate.handleShowAdvancedChange,
          }}

        />
      </div>
    </>
  )
}
