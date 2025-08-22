// apps/web/src/app/staking/page.tsx
'use client'
import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'
// import { ConnectWallet, WalletModalComponent } from '@/components/ConnectWallet'

export default function Page() {
  return (
    <>
      <StakingScreen address='12' />
    </>
  )
}
