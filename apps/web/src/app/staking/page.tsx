// apps/web/src/app/staking/page.tsx
'use client'

import { Helmet } from "react-helmet-async";

import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'
import useWalletConnect from '@/hooks/useWalletConnect';

export default function Page() {
 const { address } = useWalletConnect();

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
