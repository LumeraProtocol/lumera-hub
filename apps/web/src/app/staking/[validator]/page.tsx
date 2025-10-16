// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { StakingDetailsScreen } from '@lumera-hub/ui/src/screens/StakingDetailsScreen';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>Staking Details</title>
      </Helmet>
      <div className="staking-details-content">
        <StakingDetailsScreen />
      </div>
    </>
  )
}
