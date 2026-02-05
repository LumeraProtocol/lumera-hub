import { ReactNode } from 'react';
import Image from 'next/image';
import {
  BarChart2,
  Wallet,
  // Contact
} from '@tamagui/lucide-icons';

import AppLink from '@/components/AppLink';
import AppButton from '@/components/AppButton';
import { useSelector, useDispatch } from '@/redux/hooks';
import { setActiveView } from '@/redux/app.slice';
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

export const NAV_ITEMS: TNaxItems[] = [
  { id: "dashboard", label: "Dashboard", url: "/admin", icon: <BarChart2 /> },
  { id: "tracking", label: "Active Hub Users", url: "/admin/tracking", icon: <Wallet /> },
  // { id: "user", label: "User", url: "/admin/user", icon: <Contact /> },
];

export default function AdminLayout({ children }: IAdminLayout) {
  const dispatch = useDispatch();
  const { activeView, currentPath, viewTitle } = useSelector((state) => state.app);

  const isActive = (currentUrl: string, url: string) => {
    if (currentUrl === url) {
      return true;
    }
    return false;
  }

  const handleMenuItemClick = (item: TNaxItems) => {
    dispatch(setActiveView({
      activeView: item.id,
    }));
  }

  return (
    <div className="min-h-screen bg-lumera-navy text-white">
      {/* Sidebar (desktop) */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 z-50">
        <div className="flex flex-col flex-grow bg-lumera-navy border-r border-gray-800/50">
          <AppLink href="/">
            <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800">
              <div className="w-[104px] h-6 grid place-items-center">
                <Image src="/logo.svg" alt="Lumera" width={104} height={24} />
              </div>
            </div>
          </AppLink>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {NAV_ITEMS.map((item) => (
              <AppLink
                key={item.id}
                id={item.id}
                href={item?.url || '#'}
                className="text-lumera-teal hover:text-lumera-green text-base font-medium"
              >
                <span
                  onClick={() => handleMenuItemClick(item)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors duration-200 rounded-lg w-full ${
                    isActive(currentPath, item.url)
                      ? "text-white bg-lumera-teal"
                      : "text-lumera-gray hover:text-white hover:bg-lumera-teal"
                  }`}
                >
                  <span className="inline-block w-6 h-6">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </AppLink>
            ))}
          </nav>
          <div className="px-6 py-4 mt-auto border-t border-gray-800 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} Lumera
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="lg:pl-72 relative z-10">
        {/* Top bar */}
        <div className="sticky top-0 !z-50 flex h-16 flex-shrink-0 bg-lumera-navy backdrop-blur-lg border-b border-gray-800">
          <div className="flex flex-1 justify-between pl-0 pr-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h1 className="text-base sm:text-2xl font-bold">{viewTitle || VIEW_TITLES[activeView]}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-2">
              <AppButton>Login</AppButton>
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
