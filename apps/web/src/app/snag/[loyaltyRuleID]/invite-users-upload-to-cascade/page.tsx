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
    referLink,
    handleCopyReferLink,
  } = useSnagReferralLink();

  useEffect(() => {
    document.title = 'Get My Referral Link - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/invite-users-upload-to-cascade',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Get My Referral Link',
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
          referLink={referLink}
          onCopyReferLink={handleCopyReferLink}
          customTitle='Earn rewards for new user sign-ups + Cascade uploads via your referral:'
        />
      </div>
    </>
  )
}
