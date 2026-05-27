// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { ReferralLinkScreen } from '@lumera-hub/ui/src/screens/snag/ReferralLinkScreen';
import useSnagReferralLink from '@/hooks/useSnagReferralLink';

export default function Page() {
  const dispatch = useDispatch();
   const {
    isLoading,
    referLinkInfo,
    handleCopyReferLink,
  } = useSnagReferralLink();

  useEffect(() => {
    document.title = 'Referral Link - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/referral-link',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Referral Link',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Get My Referral Link - Lumera Hub</title>
      </Helmet>
      <div>
        <ReferralLinkScreen
          isLoading={isLoading}
          referLink={`${location.origin}/?referral_code=${referLinkInfo?.referCode || ''}`}
          totalReferralLink={referLinkInfo?.maxRefer || '10'}
          point={referLinkInfo.point}
          onCopyReferLink={handleCopyReferLink}
          customTitle={`Earn ${referLinkInfo.point} for every signed up ${referLinkInfo.maxRefer} friends`}
        />
      </div>
    </>
  )
}
