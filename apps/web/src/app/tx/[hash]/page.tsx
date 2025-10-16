// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { TransactionDetailsScreen } from '@lumera-hub/ui/src/screens/TransactionDetailsScreen';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>Transaction Details</title>
      </Helmet>
      <div className="sense-content">
        <TransactionDetailsScreen />
      </div>
    </>
  )
}
