// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyScreen } from '@lumera-hub/ui/src/screens/snag/VerifyScreen';
import useSnagVerify from '@/hooks/useSnagVerify';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    txHash,
    setTxhash,
    verifyDelegateTokens,
  } = useSnagVerify();

  useEffect(() => {
    document.title = 'Delegate Tokens - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/delegate',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Delegate Tokens',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Delegate Tokens - Lumera Hub</title>
      </Helmet>
      <div>
        <VerifyScreen
          isLoading={isLoading}
          message={message}
          txHash={txHash}
          onVerifyClick={verifyDelegateTokens}
          onChangeText={setTxhash}
        />
      </div>
    </>
  )
}
