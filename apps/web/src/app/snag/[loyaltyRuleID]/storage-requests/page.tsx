// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { SupernodeScreen } from '@lumera-hub/ui/src/screens/snag/SupernodeScreen';
import useSnagStorageRequests from '@/hooks/useSnagStorageRequests';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    address,
    setAddress,
    verifySupernode,
  } = useSnagStorageRequests();

  useEffect(() => {
    document.title = 'Storage requests - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/storage-requests',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Storage requests - Lumera Hub</title>
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
