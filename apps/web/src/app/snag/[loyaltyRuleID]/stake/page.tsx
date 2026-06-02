// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { StakeVerifyScreen } from '@lumera-hub/ui/src/screens/snag/StakeVerifyScreen';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';
import useSnagTextInput from '@/hooks/useSnagTextInput';

export default function Page() {
  const dispatch = useDispatch();
  const snag = useSnagTextInput();

  useEffect(() => {
    document.title = 'Staked - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/staked',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Staked - Lumera Hub</title>
      </Helmet>
      <div>

        {snag?.message?.type === 'not-found' ?
        <NotFoundScreen content={snag?.message.content} /> :
        <StakeVerifyScreen />
      }
      </div>
    </>
  )
}
