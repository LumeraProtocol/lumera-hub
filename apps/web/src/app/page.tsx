// apps/web/src/app/page.tsx
'use client'
import { useChain } from '@interchain-kit/react'
import { Helmet } from "react-helmet-async";

import { CHAIN_NAME } from '@/contants/network';
import useAccountInfo from '@/hooks/useAccountInfo';
import useProposals from '@/hooks/useProposals';
import useRecentActivity from '@/hooks/useRecentActivity';
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'

export default function Page() {
  const { address, connect } = useChain(CHAIN_NAME);
  const { accountInfo, loading, handleClaimButtonClick, isClaimLoading } = useAccountInfo();
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
          connect={connect} 
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
        />
      </div>
    </>
  )
}

