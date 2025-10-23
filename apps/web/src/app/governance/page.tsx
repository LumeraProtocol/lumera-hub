// apps/web/src/app/governance/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { GovernanceScreen } from '@lumera-hub/ui/src/screens/GovernanceScreen'
import useGovernances from '@/hooks/useGovernances';
import useProposals from '@/hooks/useProposals';
import useWalletConnect from '@/hooks/useWalletConnect';
import useDeposit from '@/hooks/useDeposit';

export default function Page() {
  useEffect(() => {
    document.title = 'Governance';
  }, []);

  const {
    isLoading,
    governances,
    msg,
    sumary,
    currentTab,
    isSumaryLoading,
    handleTabChange,
    fetchGovernances,
  } = useGovernances();
  const proposals = useProposals();
  const { address } = useWalletConnect();
  const deposit = useDeposit({ callback: fetchGovernances });

  return (
    <>
      <Helmet>
        <title>Governance</title>
      </Helmet>
      <div className="governance-content">
        <GovernanceScreen
          address={address}
          isLoading={isLoading}
          governances={governances}
          msg={msg}
          sumary={sumary}
          isSumaryLoading={isSumaryLoading}
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
          deposit={{
            isOpen: deposit.isModalOpen,
            sender: address,
            isVoteLoading: deposit.isLoading,
            error: deposit.error,
            voteAdvanced: deposit.depositAdvanced,
            showAdvanced: deposit.showAdvanced,
            availableAmount: deposit.availableAmount,
            setProposalId: deposit.setProposalId,
            setOpen: deposit.setModalOpen,
            onVoteClick: deposit.handleSendClick,
            setModalOpen: deposit.setModalOpen,
            handleVoteAdvancedChange: deposit.handleDepositChange,
            handleAdvancedCheckedChange: deposit.handleShowAdvancedChange,
          }}
        />
      </div>
    </>
  )
}
