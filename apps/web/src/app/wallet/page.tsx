// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { WalletScreen } from '@lumera-hub/ui/src/screens/WalletScreen'
import useAccountInfo from '@/hooks/useAccountInfo';
import useWalletConnect from '@/hooks/useWalletConnect';
import useTransaction from '@/hooks/useTransaction';
import useDelegate from '@/hooks/useDelegate';
import useSend from '@/hooks/useSend';

export default function Page() {
  const { address } = useWalletConnect();
  const { 
    accountInfo,
    selectedModal,
    handleOpenModal,
    handleCloseModal,
  } = useAccountInfo();
  const { 
    isLoading,
    error,
    transactions,
    totalTransactions,
    handlePageClick,
  } = useTransaction();
  const sendOptions = useSend({
    callback: handleCloseModal
  });
  const delegate = useDelegate()

  return (
    <>
      <Helmet>
        <title>Wallet</title>
      </Helmet>
      <div className="governance-content">
        <WalletScreen 
          walletAddress={address}
          accountInfo={accountInfo}
          isLoading={isLoading}
          error={error}
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
          }}
          delegateOptions={{
            isVoteLoading: delegate.isLoading,
            error: delegate.error,
            optionsAdvanced: delegate.optionsAdvanced,
            showAdvanced: delegate.showAdvanced,
            validators: delegate.validators,
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
