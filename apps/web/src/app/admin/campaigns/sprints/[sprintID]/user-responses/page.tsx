// app/admin/snagsolutions/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { SnagUserResponsesScreen } from '@lumera-hub/ui/src/screens/admin/SnagUserResponsesScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Manual Review Quests - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/snag/user-responses',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Manual Review Quests',
    }));
  }, []);

  return (
    <div>
      <SnagUserResponsesScreen />
    </div>
  );
}
