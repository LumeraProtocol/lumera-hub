// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyTransactions } from '@lumera-hub/ui/src/screens/snag/VerifyTransactions';
import useSnagTransactions from '@/hooks/useSnagTransactions';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
  } = useSnagTransactions();

  useEffect(() => {
    document.title = 'Send Transactions - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/send-transactions',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Send Transactions - Lumera Hub</title>
      </Helmet>
      <div>
        <VerifyTransactions
          isLoading={isLoading}
          message={message}
        />
      </div>
    </>
  )
}
