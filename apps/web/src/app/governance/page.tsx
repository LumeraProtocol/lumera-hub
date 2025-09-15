// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { GovernanceScreen } from '@lumera-hub/ui/src/screens/GovernanceScreen'

export default function Page() {
  return (
    <>
      <Helmet>
        <title>Governance</title>
      </Helmet>
      <div className="governance-content">
        <GovernanceScreen />
      </div>
    </>
  )
}
