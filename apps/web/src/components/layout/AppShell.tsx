"use client"

import React, { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import {
  X,
  BarChart2,
  LaptopMinimalCheck,
  Database,
  BrainCircuit,
  Wallet,
  Blocks,
  ArrowRight,
  ExternalLink,
} from '@tamagui/lucide-icons';
import Image from 'next/image';
import { Layers, TriangleAlert } from 'lucide-react';
import { useChain } from '@interchain-kit/react';

import { ConnectWallet, WalletModalComponent } from '@/components/ConnectWallet'
import AppLink from '@/components/AppLink';
import Tooltip from '@/components/Tooltip';
import GetStarted from '@/components/GetStarted';
import { CHAIN_NAME } from '@/contants/network';

import { useSelector, useDispatch } from '@/redux/hooks';
import { setActiveView, setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { setError } from '@/redux/error.slice';
import LumeraSymbol from '@/assets/img/lumera_symbol.svg';

import { ViewId, VIEW_TITLES } from '@/types';

type TNaxItems = {
  id: ViewId;
  label: string;
  url: string;
  icon: React.ReactNode;
  newPage?: boolean;
  newIcon?: React.ReactNode;
}

export const NAV_ITEMS: TNaxItems[] = [
  { id: "dashboard", label: "Dashboard", url: "/", icon: <BarChart2 />, newPage: false },
  { id: "wallet", label: "Wallet", url: "/wallet", icon: <Wallet />, newPage: false },
  { id: "staking", label: "Staking", url: "/staking", icon: <Layers />, newPage: false },
  { id: "governance", label: "Governance", url: "/governance", icon: <LaptopMinimalCheck />, newPage: false },
  { id: "blocks", label: "Blocks", url: "/blocks", icon: <Blocks />, newPage: false },
  { id: "cascade", label: "Cascade", url: "/cascade", icon: <Database />, newPage: false },
  // { id: "sense", label: "Sense", url: "/sense", icon: <ShieldCheck /> },
  { id: "inference", label: "Inference", url: "/inference", icon: <BrainCircuit />, newPage: false },
  {
    id: "portal",
    label: "Portal",
    url: "https://portal.testnet.lumera.io/",
    icon: <Image src={LumeraSymbol} width={20} alt="Portal" className="rounded-full" />,
    newPage: true,
    newIcon: <ExternalLink size={16} />,
  },
]

const ESSENTIALS_NAV_ITEMS: TNaxItems[] = NAV_ITEMS.slice(0, 5);
const TOOLS_NAV_ITEMS: TNaxItems[] = NAV_ITEMS.slice(5, NAV_ITEMS.length);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { address } = useChain(CHAIN_NAME);
  const { activeView, currentPath, viewTitle } = useSelector((state) => state.app);
  const { message } = useSelector((state) => state.error);
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    dispatch(setError({
      message: null,
      status: null,
    }))
    if (window?.location?.pathname) {
      dispatch(setCurrentPath({
        currentPath: window.location.pathname,
      }));
      const navItem = NAV_ITEMS.find((item) => isActive(currentPath, item.url));
      dispatch(setActiveView({
        activeView: navItem?.id || "dashboard",
      }));
    }
    const referrer = sessionStorage.getItem('acquisitionSource');
    if (!referrer) {
      sessionStorage.setItem('acquisitionSource', searchParams.get('utm_source') || document.referrer || 'Direct');
    }
  }, []);

  const onNavClick = (id: ViewId) => {
    dispatch(setActiveView({
      activeView: id,
    }));
    setSidebarOpen(false)
  }

  const isActive = (currentUrl: string, url: string) => {
    if (currentUrl === '/' && currentUrl === url) {
      return true;
    }
    return url !== NAV_ITEMS[0].url && currentUrl.indexOf(url) !== -1;
  }

  const handleMenuItemClick = (item: TNaxItems) => {
    onNavClick(item.id);
    dispatch(setViewTitle({
      viewTitle: '',
    }));
    dispatch(setCurrentPath({
      currentPath: item.url,
    }));
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
          <div>
            <div>
              <div className="text-md px-4 py-4 pb-3 text-lumera-label">Essentials</div>
              <nav className="flex-1 px-4 py-6 pt-0 space-y-2">
                {ESSENTIALS_NAV_ITEMS.map((item) => (
                  <AppLink
                    key={item.id}
                    id={item.id}
                    href={item?.url || '#'}
                    className="text-lumera-teal hover:text-lumera-green text-base font-medium block mb-1"
                    target={item.newPage ? '_blank' : ''}
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
                      <span className="inline-flex items-center justify-between gap-1 w-full">
                        {item.label}
                        {item.newIcon ?
                          <span className="inline-block w-4 h-4">{item.newIcon}</span> : null
                        }
                      </span>
                    </span>
                  </AppLink>
                ))}
              </nav>
            </div>
            <div>
              <div className="text-md px-4 py-3 pb-3 text-lumera-label">Tools</div>
              <nav className="flex-1 px-4 py-6 pt-0 space-y-2">
                {TOOLS_NAV_ITEMS.map((item) => (
                  <AppLink
                    key={item.id}
                    id={item.id}
                    href={item?.url || '#'}
                    className="text-lumera-teal hover:text-lumera-green text-base font-medium block mb-1"
                    target={item.newPage ? '_blank' : ''}
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
                      <span className="inline-flex items-center justify-between gap-1 w-full">
                        {item.label}
                        {item.newIcon ?
                          <span className="inline-block w-4 h-4">{item.newIcon}</span> : null
                        }
                      </span>
                    </span>
                  </AppLink>
                ))}
              </nav>
            </div>
          </div>
          <div className="px-6 py-4 mt-auto border-t border-gray-800 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} Lumera
          </div>
        </div>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div className="lg:hidden relative z-50" role="dialog" aria-modal="true">
        <div
          onClick={() => setSidebarOpen(false)}
          className={`inset-0 bg-gray-900/80 z-30 ${!isSidebarOpen ? 'hide' : 'fixed'}`}
        />
        <div className={`fixed inset-0 flex z-50 w-full max-w-xs h-screen transition-all duration-300 ${!isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>
          <div className="relative flex flex-1 w-full">
            <div className="flex flex-grow flex-col bg-lumera-navy border-r border-gray-800/50">
              <div className="flex justify-between items-center w-full">
                <AppLink href="/" className="text-lumera-teal hover:text-lumera-green w-full">
                  <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800 w-full">
                    <div className="w-[104px] h-6 grid place-items-center">
                      <Image src="/logo.svg" alt="Lumera" width={104} height={24} />
                    </div>
                  </div>
                </AppLink>
                <button className="btn-close mr-3" onClick={() => setSidebarOpen(false)}><X /></button>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex-1 overflow-y-auto">
                  <div>
                    <div className="text-md px-4 py-6 pb-3 text-lumera-label">Essentials</div>
                    <nav className="flex-1 px-4 py-6 pt-0 space-y-2">
                      {ESSENTIALS_NAV_ITEMS.map((item) => (
                        <AppLink
                          key={item.id}
                          href={item?.url || '#'}
                          className="text-lumera-teal hover:text-lumera-green text-base font-medium block mb-1"
                          target={item.newPage ? '_blank' : ''}
                        >
                          <span
                            onClick={() => handleMenuItemClick(item)}
                            className={`flex items-center gap-3 px-4 py-3  transition-colors duration-200 rounded-lg w-full ${
                              isActive(currentPath, item.url)
                                ? "text-white bg-lumera-teal"
                                : "text-lumera-gray hover:text-white hover:bg-lumera-teal"
                            }`}
                          >
                            <span className="inline-block w-6 h-6">{item.icon}</span>
                            <span className="inline-flex items-center justify-between gap-1 w-full">
                              {item.label}
                              {item.newIcon ?
                                <span className="inline-block w-4 h-4">{item.newIcon}</span> : null
                              }
                            </span>
                          </span>
                        </AppLink>
                      ))}
                    </nav>
                  </div>
                  <div>
                    <div className="text-md px-4 pt-0 pb-3 text-lumera-label">Tools</div>
                    <nav className="flex-1 px-4 py-6 pt-0 space-y-2">
                      {TOOLS_NAV_ITEMS.map((item) => (
                        <AppLink
                          key={item.id}
                          href={item?.url || '#'}
                          className="text-lumera-teal hover:text-lumera-green text-base font-medium block mb-1">
                          <span
                            onClick={() => handleMenuItemClick(item)}
                            className={`flex items-center gap-3 px-4 py-3  transition-colors duration-200 rounded-lg w-full ${
                              isActive(currentPath, item.url)
                                ? "text-white bg-lumera-teal"
                                : "text-lumera-gray hover:text-white hover:bg-lumera-teal"
                            }`}
                          >
                            <span className="inline-block w-6 h-6">{item.icon}</span>
                            <span className="inline-flex items-center justify-between gap-1 w-full">
                              {item.label}
                              {item.newIcon ?
                                <span className="inline-block w-4 h-4">{item.newIcon}</span> : null
                              }
                            </span>
                          </span>
                        </AppLink>
                      ))}
                    </nav>
                  </div>
                </div>
                {!address ?
                  <div className="px-4 pb-6"><GetStarted className="w-full justify-center py-3" /></div> : null
                }
              </div>
              <div className="px-6 py-4 mt-auto border-t border-gray-800 text-center text-xs text-gray-500">
                © {new Date().getFullYear()} Lumera
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="lg:pl-72 relative z-10">
        {/* Top bar */}
        <div className="sticky top-0 !z-50 flex h-16 flex-shrink-0 bg-lumera-navy backdrop-blur-lg border-b border-gray-800">
          <button
            type="button"
            className="border-r border-gray-800 px-4 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden btn-hambuger"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            aria-label="Open sidebar"
          >
            {/* simple hamburger */}
            <div className="space-y-1">
              <span className="block w-4 sm:w-6 h-0.5 bg-gray-400" />
              <span className="block w-4 sm:w-6 h-0.5 bg-gray-400" />
              <span className="block w-4 sm:w-6 h-0.5 bg-gray-400" />
            </div>
          </button>
          <div className="flex flex-1 justify-between pl-0 pr-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h1 className="text-base sm:text-2xl font-bold">{viewTitle === '&nbsp;' ? '' : viewTitle || VIEW_TITLES[activeView]}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-2">
              {message ?
                <Tooltip icon={<TriangleAlert className="text-yellow-400" />} content={<div className="text-white">Failed to fetch</div>} /> : null
              }
              {!address ?
                <div className="hidden sm:block">
                  <GetStarted />
                </div> : null
              }
              {/* Placeholder for wallet actions */}
              <ConnectWallet />
              <WalletModalComponent />
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
