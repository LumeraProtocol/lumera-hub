'use client';

import { usePathname } from 'next/navigation';

import AppShell from '@/components/layout/AppShell';
import AdminLayout from '@/components/layout/AdminLayout';
import useAdminArea from "@/hooks/useAdminArea";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAdminPage } = useAdminArea();
  const pathname = usePathname();

  // The public "scan to retrieve" pages (/action_id/<id>) are for anonymous
  // visitors, so they render bare — no sidebar, no header, no network switch.
  if (pathname?.startsWith('/action_id/')) {
    return <>{children}</>;
  }

  if (!isAdminPage) {
    return (
      <AppShell>{children}</AppShell>
    )
  }

  return (
    <AdminLayout>{children}</AdminLayout>
  );
}
