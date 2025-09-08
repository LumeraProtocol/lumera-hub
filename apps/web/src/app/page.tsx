// apps/web/src/app/page.tsx
'use client'
import { useChain } from '@interchain-kit/react'

import { CHAIN_NAME } from '@/contants/chain';
import useAccountInfo from '@/hooks/useAccountInfo';
import useProposals from '@/hooks/useProposals';
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'

export default function Page() {
  const { address, connect } = useChain(CHAIN_NAME);
  const { accountInfo, loading } = useAccountInfo();
  const proposals = useProposals();

  return (
    <div className="home-content">
      <HomeScreen 
        address={address} 
        connect={connect} 
        loading={loading}
        accountInfo={accountInfo}
        proposals={proposals.proposalsInfo}
        isProposalLoading={proposals.loading}
      />
    </div>
  )
}

