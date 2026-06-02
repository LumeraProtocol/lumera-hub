// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { VerifyInteractModules } from '@lumera-hub/ui/src/screens/snag/VerifyInteractModules';
import useSnagInteractModules from '@/hooks/useSnagInteractModules';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
  } = useSnagInteractModules();

  useEffect(() => {
    document.title = 'Interact modules  - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/interact-modules',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Interact modules - Lumera Hub</title>
      </Helmet>
      <div>
        <VerifyInteractModules
          isLoading={isLoading}
          message={message}
        />
      </div>
    </>
  )
}
