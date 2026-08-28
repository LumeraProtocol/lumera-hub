// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { ReferralLinkScreen } from '@lumera-hub/ui/src/screens/snag/ReferralLinkScreen';
import useSnagReferralLink from '@/hooks/useSnagReferralLink';
import { buildReferralLink } from '@/utils/referral-link';

export default function Page() {
  const dispatch = useDispatch();
  const [origin, setOrigin] = useState('');
  const {
    isLoading,
    referLinkInfo,
    address,
    refers,
    isClaimLoading,
    handleCopyReferLink,
    handleClaim,
  } = useSnagReferralLink();

  useEffect(() => {
    setOrigin(window.location.origin);
    document.title = 'Referral Link - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/referral-link',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, [dispatch]);

  return (
    <>
      <Helmet>
        <title>Get My Referral Link - Lumera Hub</title>
      </Helmet>
      <div>
        <ReferralLinkScreen
          isLoading={isLoading}
          referLink={origin
            ? buildReferralLink(origin, address || referLinkInfo?.referCode || '')
            : ''}
          totalReferralLink={referLinkInfo?.maxRefer || '10'}
          totalClaim={referLinkInfo?.totalClaim || 0}
          point={referLinkInfo.point}
          onCopyReferLink={handleCopyReferLink}
          onClaimLink={handleClaim}
          customTitle="Invite Friends"
          refers={refers}
          type="refer"
          isClaimLoading={isClaimLoading}
        />
      </div>
    </>
  )
}
