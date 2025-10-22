// apps/web/src/app/tx/[hash]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { TransactionDetailsScreen } from '@lumera-hub/ui/src/screens/TransactionDetailsScreen';

export default function Page() {
  useEffect(() => {
    document.title = 'Transaction Details';
  }, []);

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
