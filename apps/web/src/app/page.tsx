// apps/web/src/app/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useAccountInfo from '@/hooks/useAccountInfo';
import useProposals from '@/hooks/useProposals';
import useRecentActivity from '@/hooks/useRecentActivity';
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'
import useWalletConnect from '@/hooks/useWalletConnect';
import { IProposal } from '@/hooks/useProposals'

export default function Page() {
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState<IProposal | null>(null);

  useEffect(() => {
    document.title = 'Dashboard - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Dashboard',
    }));
  }, []);

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
  const proposals = useProposals({ customMemo: selectedItem?.title ? `Vote for the ${selectedItem?.title}` : '' });
  const recentActivityData = useRecentActivity();

  return (
    <>
      <Helmet>
          <title>Dashboard - Lumera Hub</title>
      </Helmet>
      <div className="home-content">
        <HomeScreen
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          address={address}
          loading={loading}
          accountInfo={accountInfo}
          proposals={proposals.proposalsInfo}
          userVotes={proposals.userVotes}
          isProposalLoading={proposals.loading}
          recentActivities={recentActivityData.recentActivity}
          isRecentActivityLoading={recentActivityData.loading}
          onOptionChange={proposals.handleOptionChange}
          onVoteClick={proposals.handleVote}
          voteTransactionHash={proposals.transactionHash}
          onCloseVoteCongratulationsModal={proposals.handleCloseCongratulationsModal}
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
