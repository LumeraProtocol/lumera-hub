// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyTransactions } from '@lumera-hub/ui/src/screens/snag/VerifyTransactions';
import useSnagDecentralizationStake from '@/hooks/useSnagDecentralizationStake';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
  } = useSnagDecentralizationStake();

  useEffect(() => {
    document.title = 'Decentralization Stake - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/decentralization-stake',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Decentralization Stake - Lumera Hub</title>
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
