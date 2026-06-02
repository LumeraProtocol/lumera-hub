// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { BalanceVerifyScreen } from '@lumera-hub/ui/src/screens/snag/BalanceVerifyScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Balance - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/balance',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Balance - Lumera Hub</title>
      </Helmet>
      <div>
        <BalanceVerifyScreen />
      </div>
    </>
  )
}
