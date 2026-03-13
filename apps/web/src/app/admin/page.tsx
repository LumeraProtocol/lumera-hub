// app/admin/page.tsx
'use client'

import { useEffect } from "react";
import { useRouter } from 'next/navigation';

import { useDispatch } from '@/redux/hooks';
import useDownloadDb from '@/hooks/admin/useDownloadDb';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { DashboardScreen } from '@lumera-hub/ui/src/screens/admin/DashboardScreen';

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const router = useRouter();
  const {
    isLoading,
    isRemove,
    canRemove,
    handleDownloadDb,
    handleRemoveDb,
  } = useDownloadDb();

  useEffect(() => {
    document.title = 'Dashboard Admin - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Dashboard',
    }));
  }, []);

  const handleRedirect = (url: string) => {
    router.push(url);
  }

  return (
    <div>
      <DashboardScreen
        isLoading={isLoading}
        isRemove={isRemove}
        canRemove={canRemove}
        onRemoveDb={handleRemoveDb}
        onRedirect={handleRedirect}
        onDownloadDb={handleDownloadDb}
      />
    </div>
  );
}
