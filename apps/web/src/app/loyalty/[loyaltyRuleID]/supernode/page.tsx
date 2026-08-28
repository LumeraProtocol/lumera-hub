// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { SupernodeScreen } from '@lumera-hub/ui/src/screens/snag/SupernodeScreen';
import useSnagSupernode from '@/hooks/useSnagSupernode';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';
import useSnagTextInput from '@/hooks/useSnagTextInput';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    address,
    isVerified,
    handleRecaptchaChange,
    setAddress,
    verifySupernode,
  } = useSnagSupernode();
  const snag = useSnagTextInput();

  useEffect(() => {
    document.title = 'Supernode - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/supernode',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Supernode - Lumera Hub</title>
      </Helmet>
      <div>
        {snag?.message?.type === 'not-found' ?
          <NotFoundScreen content={snag?.message.content} /> :
          <SupernodeScreen
            isLoading={isLoading}
            message={message}
            address={address}
            quest={snag?.quest}
            isVerified={isVerified}
            oneRecaptchaChange={handleRecaptchaChange}
            onVerifyClick={verifySupernode}
            onChangeText={setAddress}
          />
        }
      </div>
    </>
  )
}
