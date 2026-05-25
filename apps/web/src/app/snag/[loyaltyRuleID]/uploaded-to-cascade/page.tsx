// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyTransactions } from '@lumera-hub/ui/src/screens/snag/VerifyTransactions';
import useSnagUploadedToCascade from '@/hooks/useSnagUploadedToCascade';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
  } = useSnagUploadedToCascade();

  useEffect(() => {
    document.title = 'Cascade - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/uploaded-to-cascade',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Cascade',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Cascade - Lumera Hub</title>
      </Helmet>
      <div>
        <VerifyTransactions
          isLoading={isLoading}
          message={message}
        />
      </div>
    </>
  )
}
