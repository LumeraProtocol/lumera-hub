'use client'; // Quan trọng nhất là dòng này

import AppShell from '@/components/layout/AppShell'
import AdminLayout from '@/components/layout/AdminLayout'
import useAdminArea from "@/hooks/useAdminArea";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAdminPage } = useAdminArea();

  if (!isAdminPage) {
    return (
      <AppShell>{children}</AppShell>
    )
  }

  // Bạn có thể dùng isAdminPage ở đây để thay đổi UI
  return (
    <AdminLayout>{children}</AdminLayout>
  );
}
