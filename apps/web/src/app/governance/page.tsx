// apps/web/src/app/governance/page.tsx
'use client'
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import { GovernanceScreen } from '@lumera-hub/ui/src/screens/GovernanceScreen'
import useGovernances from '@/hooks/useGovernances';
import useProposals, { IProposal } from '@/hooks/useProposals';
import useWalletConnect from '@/hooks/useWalletConnect';
import useDeposit from '@/hooks/useDeposit';
import { useDispatch } from '@/redux/hooks';
import { setActiveView, setCurrentPath } from '@/redux/app.slice';
import { NAV_ITEMS } from '@/components/layout/AppShell';

export default function Page() {
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState<IProposal | null>(null);

  useEffect(() => {
    document.title = 'Governance';
    dispatch(setCurrentPath({
      currentPath: NAV_ITEMS[3].url,
    }));
    dispatch(setActiveView({
      activeView: NAV_ITEMS[3].id,
    }));
  }, []);

  const {
    isLoading,
    governances,
    msg,
    sumary,
    currentTab,
    isSumaryLoading,
    totalVotes,
    nextKey,
    step,
    selectedModal,
    proposal,
    isCreateProposalLoading,
    transactionHash,
    requiredDeposit,
    fetchData,
    handleCreateProposalClick,
    handleBackClick,
    handleInputChange,
    handleOpenCreateProposalModal,
    handleCloseCreateProposalModal,
    handleNextSteps,
    handlePageClick,
    handleTabChange,
  } = useGovernances();
  const proposals = useProposals({
    customMemo: selectedItem ? `Vote for the ${selectedItem.title}` : '',
    callback: fetchData,
  });
  const { address } = useWalletConnect();
  const deposit = useDeposit({
    callback: fetchData,
    customMemo: selectedItem ? `Deposit for the ${selectedItem.title}` : '',
  });

  return (
    <>
      <Helmet>
        <title>Governance</title>
      </Helmet>
      <div className="governance-content">
        <GovernanceScreen
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          address={address}
          isLoading={isLoading}
          governances={governances}
          msg={msg}
          sumary={sumary}
          isSumaryLoading={isSumaryLoading}
          totalVotes={totalVotes}
          nextKey={nextKey}
          handlePageClick={handlePageClick}
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onOptionChange={proposals.handleOptionChange}
          onVoteClick={proposals.handleVote}
          isVoteLoading={proposals.isVoteLoading}
          error={proposals.errorVote}
          voteAdvanced={proposals.voteAdvanced}
          handleVoteAdvancedChange={proposals.handleVoteAdvancedChange}
          handleResetError={proposals.handleResetError}
          isVoteOpen={proposals.isVoteOpen}
          setVoteOpen={proposals.setVoteOpen}
          voteTransactionHash={proposals.transactionHash}
          onCloseVoteCongratulationsModal={proposals.handleCloseCongratulationsModal}
          deposit={{
            isOpen: deposit.isModalOpen,
            sender: address,
            isVoteLoading: deposit.isLoading,
            error: deposit.error,
            voteAdvanced: deposit.depositAdvanced,
            showAdvanced: deposit.showAdvanced,
            availableAmount: deposit.availableAmount,
            transactionHash: deposit.transactionHash,
            setProposalId: deposit.setProposalId,
            setOpen: deposit.setModalOpen,
            onVoteClick: deposit.handleSendClick,
            setModalOpen: deposit.setModalOpen,
            handleVoteAdvancedChange: deposit.handleDepositChange,
            handleAdvancedCheckedChange: deposit.handleShowAdvancedChange,
            handleCloseCongratulationsModal: deposit.handleCloseCongratulationsModal,
          }}
          createProposal={{
            step,
            selectedModal,
            proposal,
            isLoading: isCreateProposalLoading,
            msg,
            transactionHash,
            requiredDeposit,
            onOpenCreateProposalModalClick: handleOpenCreateProposalModal,
            onCloseCreateProposalModalClick: handleCloseCreateProposalModal,
            onNextStepsClick: handleNextSteps,
            onInputChange: handleInputChange,
            onBackClick: handleBackClick,
            onCreateProposalClick: handleCreateProposalClick,
          }}
        />
      </div>
    </>
  )
}
