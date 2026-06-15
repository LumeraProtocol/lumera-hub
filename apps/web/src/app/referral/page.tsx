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
    address,
    refers,
    handleCopyReferLink,
  } = useSnagReferralLink();

  useEffect(() => {
    document.title = 'Referral Link - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/referral-link',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
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
          referLink={`${location.origin}/${address ? '?referral_code=' : ''}${address ? address : referLinkInfo?.referCode || ''}`}
          totalReferralLink={referLinkInfo?.maxRefer || '10'}
          point={referLinkInfo.point}
          onCopyReferLink={handleCopyReferLink}
          customTitle="Invite Friends"
          refers={refers}
          walletAddress={address}
        />
      </div>
    </>
  )
}
