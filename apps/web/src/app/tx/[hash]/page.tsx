// apps/web/src/app/tx/[hash]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import useTransactionDetails from '@/hooks/useTransactionDetails';
import { TransactionDetailsScreen } from '@lumera-hub/ui/src/screens/TransactionDetailsScreen';

export default function Page() {
  const { isLoading, transaction } = useTransactionDetails();

  useEffect(() => {
    document.title = 'Transaction Details';
  }, []);

  return (
    <>
      <Helmet>
        <title>Transaction Details</title>
      </Helmet>
      <div className="sense-content">
        <TransactionDetailsScreen isLoading={isLoading} transaction={transaction} />
      </div>
    </>
  )
}
