// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyScreen } from '@lumera-hub/ui/src/screens/snag/VerifyScreen';
import useSnagVerify from '@/hooks/useSnagVerify';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';
import useSnagTextInput from '@/hooks/useSnagTextInput';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    txHash,
    isVerified,
    handleRecaptchaChange,
    setTxhash,
    verifyClaimTokens,
  } = useSnagVerify();
  const snag = useSnagTextInput();

  useEffect(() => {
    document.title = 'Claim Tokens - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/claim',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Claim Tokens - Lumera Hub</title>
      </Helmet>
      <div>
        {snag?.message?.type === 'not-found' ?
          <NotFoundScreen content={snag?.message.content} /> :
          <VerifyScreen
            isLoading={isLoading}
            message={message}
            txHash={txHash}
            quest={snag?.quest}
            isVerified={isVerified}
            oneRecaptchaChange={handleRecaptchaChange}
            onVerifyClick={verifyClaimTokens}
            onChangeText={setTxhash}
          />
        }
      </div>
    </>
  )
}
