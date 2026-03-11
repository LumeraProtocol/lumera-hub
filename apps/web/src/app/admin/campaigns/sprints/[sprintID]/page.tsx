// app/admin/snagsolutions/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { SnagScreen } from '@lumera-hub/ui/src/screens/admin/SnagScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Snag - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/snag',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Snag',
    }));
  }, []);

  return (
    <div>
      <SnagScreen />
    </div>
  );
}
