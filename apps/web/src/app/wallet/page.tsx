// apps/web/src/app/wallet/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { WalletScreen } from '@lumera-hub/ui/src/screens/WalletScreen'
import useAccountInfo from '@/hooks/useAccountInfo';
import useWalletConnect from '@/hooks/useWalletConnect';
import useTransaction from '@/hooks/useTransaction';
import useDelegate from '@/hooks/useDelegate';
import useSend from '@/hooks/useSend';

export default function Page() {
  const { address, isEvm } = useWalletConnect();
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
  } = useTransaction();
  const sendOptions = useSend({
    callback: isEvm ? account.fetchData : handleCloseModal,
    customMemo: '',
  });
  const delegate = useDelegate();
  useEffect(() => {
    document.title = 'Wallet - Lumera Hub';
  }, []);

  return (
    <>
      <Helmet>
        <title>Wallet - Lumera Hub</title>
      </Helmet>
      <div className="governance-content">
        <WalletScreen
          walletAddress={address}
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
