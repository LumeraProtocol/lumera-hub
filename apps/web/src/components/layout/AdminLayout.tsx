import { ReactNode } from 'react';
import Image from 'next/image';

import AppLink from '@/components/AppLink';
import { useSelector } from '@/redux/hooks';
import { ViewId, VIEW_TITLES } from '@/types';

export type TNaxItems = {
  id: ViewId;
  label: string;
  url: string;
  icon: React.ReactNode;
}

interface IAdminLayout {
  children: ReactNode;
}

export default function AdminLayout({ children }: IAdminLayout) {
  const { activeView, viewTitle } = useSelector((state) => state.app);

  return (
    <div className="min-h-screen bg-lumera-navy text-white">
      {/* Content area */}
      <div className="relative z-10">
        {/* Top bar */}
        <div className="sticky top-0 !z-50 flex h-16 flex-shrink-0 bg-lumera-navy backdrop-blur-lg border-b border-gray-800">
          <div className="flex flex-1 justify-between pl-0 pr-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <AppLink href="/">
                <Image src="/logo.svg" alt="Lumera" width={104} height={24} />
              </AppLink>
              <h1 className="pl-10 text-base sm:text-2xl font-bold !leading-none mt-2">
                {viewTitle || VIEW_TITLES[activeView]}
              </h1>
            </div>
          </div>
        </div>

        {/* Main children content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6 bg-lumera-navy z-1">
          {children}
        </main>
      </div>
    </div>
  )
}
