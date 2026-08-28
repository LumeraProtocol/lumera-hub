// app/admin/snagsolutions/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { CreateLoyaltyRuleScreen } from '@lumera-hub/ui/src/screens/admin/CreateLoyaltyRuleScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Create Rule - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/campaigns/create',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Create Rule',
    }));
  }, []);

  return (
    <div>
      <CreateLoyaltyRuleScreen />
    </div>
  );
}
