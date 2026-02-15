// app/admin/wallet/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import TrackingScreen from '@lumera-hub/ui/src/screens/admin/TrackingScreen';

export default function AdminWallet() {
  const dispatch = useDispatch();

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);

    document.title = 'Admin dashboard - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/tracking',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Admin dashboard',
    }));

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div>
      <TrackingScreen />
    </div>
  );
}
