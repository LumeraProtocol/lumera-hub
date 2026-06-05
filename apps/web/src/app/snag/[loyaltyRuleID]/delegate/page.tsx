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
    setIsVerified,
    setTxhash,
    verifyDelegateTokens,
  } = useSnagVerify();
  const snag = useSnagTextInput();

  useEffect(() => {
    document.title = 'Delegate Tokens - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/delegate',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Delegate Tokens - Lumera Hub</title>
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
            onVerified={setIsVerified}
            onVerifyClick={verifyDelegateTokens}
            onChangeText={setTxhash}
          />
        }
      </div>
    </>
  )
}
