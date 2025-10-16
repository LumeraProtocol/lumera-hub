// apps/web/src/app/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import useAccountInfo from '@/hooks/useAccountInfo';
import useProposals from '@/hooks/useProposals';
import useRecentActivity from '@/hooks/useRecentActivity';
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'
import useWalletConnect from '@/hooks/useWalletConnect';

export default function Page() {
  const { address } = useWalletConnect();
  const { 
    accountInfo, 
    loading, 
    handleClaimButtonClick, 
    isClaimLoading, 
    claimInfo, 
    errorClaim, 
    handleClaimChange, 
    handleToggleClaimModal, 
    isClaimModalOpen, 
    transactionHash, 
    handleCloseCongratulationsModal,
  } = useAccountInfo();
  const proposals = useProposals();
  const recentActivityData = useRecentActivity();

  return (
    <>
      <Helmet>
          <title>Lumera</title>
      </Helmet>
      <div className="home-content">
        <HomeScreen 
          address={address} 
          loading={loading}
          accountInfo={accountInfo}
          proposals={proposals.proposalsInfo}
          isProposalLoading={proposals.loading}
          recentActivities={recentActivityData.recentActivity}
          isRecentActivityLoading={recentActivityData.loading}
          onOptionChange={proposals.handleOptionChange}
          onVoteClick={proposals.handleVote}
          isVoteLoading={proposals.isVoteLoading}
          error={proposals.errorVote}
          voteAdvanced={proposals.voteAdvanced}
          handleVoteAdvancedChange={proposals.handleVoteAdvancedChange}
          onClaimButtonClick={handleClaimButtonClick}
          handleResetError={proposals.handleResetError}
          isClaimLoading={isClaimLoading}
          claimInfo={claimInfo}
          errorClaim={errorClaim}
          handleClaimChange={handleClaimChange}
          handleToggleClaimModal={handleToggleClaimModal}
          isClaimModalOpen={isClaimModalOpen}
          transactionHash={transactionHash}
          onCloseCongratulationsModal={handleCloseCongratulationsModal}
        />
      </div>
    </>
  )
}

