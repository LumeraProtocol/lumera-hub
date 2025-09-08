// apps/web/src/app/staking/page.tsx
'use client'

import { useChain } from '@interchain-kit/react'

import { CHAIN_NAME } from '@/contants/chain';
import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'

export default function Page() {
  const { address } = useChain(CHAIN_NAME)

  return (
    <div className="staking-content">
      <StakingScreen address={address} />
    </div>
  )
}
