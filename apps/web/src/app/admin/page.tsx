// app/admin/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { DashboardScreen } from '@lumera-hub/ui/src/screens/admin/DashboardScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Dashboard Admin - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Dashboard',
    }));
  }, []);

  return (
    <div>
      <DashboardScreen />
    </div>
  );
}
