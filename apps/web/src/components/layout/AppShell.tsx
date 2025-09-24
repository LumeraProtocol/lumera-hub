"use client"

import React, { useState, useEffect } from "react"
import { X, BarChart2, Hotel, LaptopMinimalCheck, Database, ShieldCheck, Image, BrainCircuit } from '@tamagui/lucide-icons'

import { ConnectWallet, WalletModalComponent } from '@/components/ConnectWallet'

// Minimal application shell with a left sidebar and a top panel
// Inspired by docs/preliminary-ui-design.html but simplified and dependency-free (no icon libs)
// TailwindCSS v4 classes are used (configured via globals.css)

export const NAV_ITEMS: { id: ViewId; label: string, url: string, icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", url: "/", icon: <BarChart2 /> },
  { id: "staking", label: "Staking", url: "/staking", icon: <Hotel /> },
  { id: "governance", label: "Governance", url: "/governance", icon: <LaptopMinimalCheck /> },
  { id: "cascade", label: "Cascade", url: "/cascade", icon: <Database /> },
  { id: "sense", label: "Sense", url: "#", icon: <ShieldCheck /> },
  { id: "inference", label: "Inference", url: "#", icon: <BrainCircuit /> },
  { id: "nfts", label: "NFTs", url: "#", icon: <Image /> },
]

const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: "Dashboard",
  staking: "Staking",
  governance: "Governance",
  cascade: "Cascade",
  sense: "Sense",
  inference: "Inference",
  nfts: "NFTs",
}

type ViewId =
  | "dashboard"
  | "staking"
  | "governance"
  | "cascade"
  | "sense"
  | "inference"
  | "nfts"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const [currentPath, setCurrentPath] = useState<string>(NAV_ITEMS[0].url);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
      const navItem = NAV_ITEMS.find((item) => item.url === window.location.pathname);
      setActiveView(navItem?.id || "dashboard")
    }
  }, []);

  const onNavClick = (id: ViewId) => {
    setActiveView(id)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-lumera-navy text-white">
      {/* Sidebar (desktop) */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 z-50">
        <div className="flex flex-col flex-grow bg-lumera-navy border-r border-gray-800/50">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800">
            <div className="w-6 h-6 grid place-items-center">
              <img src="/lumera-symbol.svg" alt="Lumera" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Lumera</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</p>
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item?.url || '#'}
                onClick={(e) => {
                  if (!item?.url) {
                    e.preventDefault()
                    onNavClick(item.id)
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                  currentPath === item.url
                    ? "text-white bg-indigo-600/30"
                    : "text-lumera-gray hover:text-white hover:bg-gray-700/50"
                }`}
              >
                <span className="inline-block w-6 h-6">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
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
                <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800">
                  <div className="w-6 h-6 grid place-items-center">
                    <img src="/lumera-symbol.svg" alt="Lumera" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Lumera</h1>
                </div>
                <button className="btn-close" onClick={() => setSidebarOpen(false)}><X /></button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2">
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</p>
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={item?.url || '#'}
                    onClick={(e) => {
                      if (!item?.url) {
                        e.preventDefault()
                        onNavClick(item.id)
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                      currentPath === item.url
                        ? "text-white bg-indigo-600/30"
                        : "text-lumera-gray hover:text-white hover:bg-gray-700/50"
                    }`}
                  >
                    <span className="inline-block w-6 h-6">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </nav>
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
              <span className="block w-6 h-0.5 bg-gray-400" />
              <span className="block w-6 h-0.5 bg-gray-400" />
              <span className="block w-6 h-0.5 bg-gray-400" />
            </div>
          </button>
          <div className="flex flex-1 justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">{VIEW_TITLES[activeView]}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-3">
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
