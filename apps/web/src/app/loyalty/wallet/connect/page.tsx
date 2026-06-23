// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { WalletConnectScreen } from '@lumera-hub/ui/src/screens/snag/WalletConnectScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Wallet Connect - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/wallet/connect',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Wallet Connect',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Wallet Connect - Lumera Hub</title>
      </Helmet>
      <div>
        <WalletConnectScreen />
      </div>
    </>
  )
}
