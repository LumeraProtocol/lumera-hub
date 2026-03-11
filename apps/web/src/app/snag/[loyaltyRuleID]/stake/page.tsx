// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { StakeVerifyScreen } from '@lumera-hub/ui/src/screens/snag/StakeVerifyScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Staked - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/staked',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Staked',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Staked - Lumera Hub</title>
      </Helmet>
      <div>
        <StakeVerifyScreen />
      </div>
    </>
  )
}
