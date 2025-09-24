// apps/web/src/app/staking/page.tsx
'use client'

import { useChain } from '@interchain-kit/react'
import { Helmet } from "react-helmet-async";

import { CHAIN_NAME } from '@/contants/network';
import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'

export default function Page() {
  const { address } = useChain(CHAIN_NAME)

  return (
    <>
      <Helmet>
          <title>Staking</title>
      </Helmet>
      <div className="staking-content">
        <StakingScreen address={address} />
      </div>
    </>
  )
}
