"use client"

import { ReactNode, useEffect } from 'react';
import Image from 'next/image';
import dayjs from 'dayjs';
import { LogOut } from 'lucide-react';

import AppLink from '@/components/AppLink';
import { LoginScreen } from '@lumera-hub/ui/src/screens/admin/LoginScreen';
import { useSelector, useDispatch } from '@/redux/hooks';
import useLoginScreen from '@/hooks/admin/useLoginScreen';
import * as admin from '@/redux/admin.slice';
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
  const dispatch = useDispatch();
  const { activeView, viewTitle } = useSelector((state) => state.app);
  const {
    isLoading,
    isLogged,
    message,
    fornContent,
    handleLogin,
    handleInputChange,
  } = useLoginScreen();

  useEffect(() => {
    const isNewConnect = sessionStorage.getItem('new_admin_connect');
    if (!isNewConnect) {
      dispatch(admin.setDate({
        startDate: `${new Date(dayjs().subtract(30, 'day').valueOf())}`,
        endDate: `${new Date()}`,
      }));
    }
  }, []);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-lumera-navy text-white">
        <div className="relative z-10">
          <LoginScreen
            fornContent={fornContent}
            isLoading={isLoading}
            message={message}
            onInputChange={handleInputChange}
            onLoginButtonClick={handleLogin}
          />
        </div>
      </div>
    );
  }

  const handleDesconnect = () => {
    localStorage.removeItem('adminUser');
    location.href = '/admin';
  }

  return (
    <div className="min-h-screen bg-lumera-navy text-white">
      {/* Content area */}
      <div className="relative z-10">
        {/* Top bar */}
        <div className="sticky top-0 !z-50 flex h-16 flex-shrink-0 bg-lumera-navy backdrop-blur-lg border-b border-gray-800">
          <div className="flex flex-1 items-center justify-between pl-0 pr-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <AppLink href="/admin">
                <Image src="/logo.svg" alt="Lumera" width={104} height={24} />
              </AppLink>
              <h1 className="pl-10 text-base sm:text-2xl font-bold !leading-none mt-2">
                {viewTitle || VIEW_TITLES[activeView]}
              </h1>
            </div>
            {isLogged ?
              <button onClick={handleDesconnect} className='btn-logout'><LogOut className='w-4 h-4' /></button> : null
            }
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
