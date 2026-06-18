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
    isClaimLoading,
    handleCopyReferLink,
    handleClaim,
  } = useSnagReferralLink('cascade');

  useEffect(() => {
    document.title = 'Referral Link - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/invite-users-upload-to-cascade',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Referral Link - Lumera Hub</title>
      </Helmet>
      <div>
        <ReferralLinkScreen
          isLoading={isLoading}
          referLink={`${location.origin}/?referral_code=${address ? address : referLinkInfo?.referCode || ''}`}
          totalReferralLink={referLinkInfo?.maxRefer || '10'}
          totalClaim={referLinkInfo?.totalClaim || 0}
          point={referLinkInfo.point}
          onCopyReferLink={handleCopyReferLink}
          onClaimLink={handleClaim}
          customTitle="Invite Friends"
          refers={refers}
          type="cascade"
          isClaimLoading={isClaimLoading}
        />
      </div>
    </>
  )
}
