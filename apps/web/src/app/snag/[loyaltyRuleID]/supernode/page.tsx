// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { SupernodeScreen } from '@lumera-hub/ui/src/screens/snag/SupernodeScreen';
import useSnagSupernode from '@/hooks/useSnagSupernode';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    address,
    setAddress,
    verifySupernode,
  } = useSnagSupernode();

  useEffect(() => {
    document.title = 'Supernode - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/supernode',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Supernode',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Supernode - Lumera Hub</title>
      </Helmet>
      <div>
        <SupernodeScreen
          isLoading={isLoading}
          message={message}
          address={address}
          onVerifyClick={verifySupernode}
          onChangeText={setAddress}
        />
      </div>
    </>
  )
}
