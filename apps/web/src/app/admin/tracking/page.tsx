// app/admin/wallet/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import TrackingScreen from '@lumera-hub/ui/src/screens/admin/TrackingScreen';

export default function AdminWallet() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Active Hub Users - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/tracking',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Active Hub Users',
    }));
  }, []);

  return (
    <div>
      <TrackingScreen />
    </div>
  );
}
