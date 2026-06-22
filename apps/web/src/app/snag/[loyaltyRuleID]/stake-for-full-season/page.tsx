// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { StakeForFullSeasonScreen } from '@lumera-hub/ui/src/screens/snag/StakeForFullSeasonScreen';
import useSnagStakeForFullSeason from '@/hooks/useSnagStakeForFullSeason';
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
  } = useSnagStakeForFullSeason();
  const snag = useSnagTextInput();

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
        {snag?.message?.type === 'not-found' ?
          <NotFoundScreen content={snag?.message.content} /> :
          <StakeForFullSeasonScreen
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
