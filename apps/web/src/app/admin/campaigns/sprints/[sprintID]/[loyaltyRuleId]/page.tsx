// app/admin/snagsolutions/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { EditLoyaltyRuleScreen } from '@lumera-hub/ui/src/screens/admin/EditLoyaltyRuleScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Edit Rule - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/campaigns/edit',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Edit Rule',
    }));
  }, []);

  return (
    <div>
      <EditLoyaltyRuleScreen />
    </div>
  );
}
