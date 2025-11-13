// apps/web/src/app/tx/[hash]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useTransactionDetails from '@/hooks/useTransactionDetails';
import { TransactionDetailsScreen } from '@lumera-hub/ui/src/screens/TransactionDetailsScreen';

export default function Page() {
  const dispatch = useDispatch();
  const { isLoading, transaction } = useTransactionDetails();

  useEffect(() => {
    document.title = 'Transaction';
    dispatch(setCurrentPath({
      currentPath: '/tx',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Transaction',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Transaction</title>
      </Helmet>
      <div className="sense-content">
        <TransactionDetailsScreen isLoading={isLoading} transaction={transaction} />
      </div>
    </>
  )
}
