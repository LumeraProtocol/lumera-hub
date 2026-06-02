// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyTransactions } from '@lumera-hub/ui/src/screens/snag/VerifyTransactions';
import useSnagStakeLume from '@/hooks/useSnagStakeLume';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';
import useSnagTextInput from '@/hooks/useSnagTextInput';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
  } = useSnagStakeLume();
  const snag = useSnagTextInput();

  useEffect(() => {
    document.title = 'Stake LUME - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/stake-lume',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Stake LUME - Lumera Hub</title>
      </Helmet>
      <div>
        {snag?.message?.type === 'not-found' ?
          <NotFoundScreen content={snag?.message.content} /> :
          <VerifyTransactions
            isLoading={isLoading}
            message={message}
          />
        }
      </div>
    </>
  )
}
