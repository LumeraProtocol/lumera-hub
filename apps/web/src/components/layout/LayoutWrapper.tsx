'use client';

import { usePathname } from 'next/navigation';

import AppShell from '@/components/layout/AppShell';
import AdminLayout from '@/components/layout/AdminLayout';
import useAdminArea from "@/hooks/useAdminArea";
import { WalletModalComponent } from '@/components/ConnectWallet';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdminPage } = useAdminArea();

  if (pathname?.includes('/snag') && !pathname?.includes('/admin')) {
    return (
      <div>
        {children}
        <WalletModalComponent />
      </div>
    )
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
