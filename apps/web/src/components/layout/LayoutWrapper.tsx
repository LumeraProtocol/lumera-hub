'use client';

import AppShell from '@/components/layout/AppShell';
import AdminLayout from '@/components/layout/AdminLayout';
import useAdminArea from "@/hooks/useAdminArea";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAdminPage } = useAdminArea();

  if (!isAdminPage) {
    return (
      <AppShell>{children}</AppShell>
    )
  }

  return (
    <AdminLayout>{children}</AdminLayout>
  );
}
