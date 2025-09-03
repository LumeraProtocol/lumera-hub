// apps/web/src/app/staking/page.tsx
'use client'
import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'

export default function Page() {
  return (
    <div className="staking-content">
      <StakingScreen address='lumera' />
    </div>
  )
}
