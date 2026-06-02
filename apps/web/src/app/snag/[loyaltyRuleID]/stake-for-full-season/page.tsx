// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { StakeForFullSeasonScreen } from '@lumera-hub/ui/src/screens/snag/StakeForFullSeasonScreen';
import useSnagStakeForFullSeason from '@/hooks/useSnagStakeForFullSeason';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    address,
    setAddress,
    verifySupernode,
  } = useSnagStakeForFullSeason();

  useEffect(() => {
    document.title = 'Stake for full season - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/stake-for-full-season',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Stake for full season - Lumera Hub</title>
      </Helmet>
      <div>
        <StakeForFullSeasonScreen
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
