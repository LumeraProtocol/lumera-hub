// app/admin/snagsolutions/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { ReferralStatsScreen } from '@lumera-hub/ui/src/screens/admin/ReferralStatsScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Referral Stats - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/referral-stats',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Referral Stats',
    }));
  }, []);

  return (
    <div>
      <ReferralStatsScreen />
    </div>
  );
}
