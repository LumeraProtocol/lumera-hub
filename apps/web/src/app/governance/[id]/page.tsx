'use client';
import { use } from 'react';
import { Helmet } from 'react-helmet-async';

import useGovernanceDetails from '@/hooks/useGovernanceDetails';
import useDeposit from '@/hooks/useDeposit';
import useProposals from '@/hooks/useProposals';
import useWalletConnect from '@/hooks/useWalletConnect';
import { GovernanceDetailsScreen } from '@lumera-hub/ui/src/screens/GovernanceDetailsScreen';

interface Props {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: Props) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const {
    isLoading,
    governance,
    pool,
    latestBlock,
    votes,
    totalVotes,
    handlePageClick,
    fetchGovernanceDetail,
  } = useGovernanceDetails(id);
  const deposit = useDeposit({ callback: () => fetchGovernanceDetail(id) });
  const proposals = useProposals();
  const { address } = useWalletConnect();

  return (
    <>
      <Helmet>
        <title>{governance?.title || 'Governance Detail'}</title>
      </Helmet>
      <div className="governance-content">
        <GovernanceDetailsScreen 
          isLoading={isLoading}
          governance={governance}
          pool={pool}
          block={latestBlock}
          votes={votes}
          totalVotes={totalVotes}
          handlePageClick={handlePageClick}
          deposit={{
            isOpen: deposit.isModalOpen, 
            sernder: address, 
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
          vote={{
            address,
            onOptionChange: proposals.handleOptionChange,
            onVoteClick: proposals.handleVote,
            isVoteLoading: proposals.isVoteLoading,
            error: proposals.errorVote,
            voteAdvanced: proposals.voteAdvanced,
            handleVoteAdvancedChange: proposals.handleVoteAdvancedChange,
            handleResetError: proposals.handleResetError,
            isVoteOpen: proposals.isVoteOpen,
            setVoteOpen: proposals.setVoteOpen,
          }}
        />
      </div>
    </>
  );
}