// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyTransactions } from '@lumera-hub/ui/src/screens/snag/VerifyTransactions';
import useSnagStakeLume from '@/hooks/useSnagStakeLume';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
  } = useSnagStakeLume();

  useEffect(() => {
    document.title = 'Stake LUME - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/stake-lume',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Stake LUME',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Stake LUME - Lumera Hub</title>
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
