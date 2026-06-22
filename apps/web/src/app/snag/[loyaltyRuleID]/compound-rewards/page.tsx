// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyCompoundScreen } from '@lumera-hub/ui/src/screens/snag/VerifyCompoundScreen';
import useSnagVerifyCompound from '@/hooks/useSnagVerifyCompound';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';
import useSnagTextInput from '@/hooks/useSnagTextInput';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    txHash,
    claimTxHash,
    isVerified,
    handleRecaptchaChange,
    setClaimTxhash,
    setTxhash,
    verifyClaimCompound,
  } = useSnagVerifyCompound();
  const snag = useSnagTextInput();

  useEffect(() => {
    document.title = 'Compound rewards - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/compound-rewards',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Compound rewards - Lumera Hub</title>
      </Helmet>
      <div>
        {snag?.message?.type === 'not-found' ?
          <NotFoundScreen content={snag?.message.content} /> :
          <VerifyCompoundScreen
            isLoading={isLoading}
            message={message}
            txHash={txHash}
            claimTxHash={claimTxHash}
            quest={snag?.quest}
            isVerified={isVerified}
            oneRecaptchaChange={handleRecaptchaChange}
            onVerifyClick={verifyClaimCompound}
            onChangeText={setTxhash}
            onClaimTxhashChange={setClaimTxhash}
          />
        }
      </div>
    </>
  )
}
