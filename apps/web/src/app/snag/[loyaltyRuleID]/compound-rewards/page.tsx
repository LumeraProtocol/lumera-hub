// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyCompoundScreen } from '@lumera-hub/ui/src/screens/snag/VerifyCompoundScreen';
import useSnagVerifyCompound from '@/hooks/useSnagVerifyCompound';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    txHash,
    claimTxHash,
    setClaimTxhash,
    setTxhash,
    verifyClaimCompound,
  } = useSnagVerifyCompound();

  useEffect(() => {
    document.title = 'Compound rewards - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/compound-rewards',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Compound rewards',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Compound rewards - Lumera Hub</title>
      </Helmet>
      <div>
        <VerifyCompoundScreen
          isLoading={isLoading}
          message={message}
          txHash={txHash}
          claimTxHash={claimTxHash}
          onVerifyClick={verifyClaimCompound}
          onChangeText={setTxhash}
          onClaimTxhashChange={setClaimTxhash}
        />
      </div>
    </>
  )
}
