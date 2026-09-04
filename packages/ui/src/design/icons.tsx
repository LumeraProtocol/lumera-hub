'use client'

/*
 * The icon set the redesign uses, drawn inline at 1.8 stroke on a 24 grid.
 *
 * These are declared here rather than pulled from lucide-react so the nav and
 * shell keep a single consistent weight, and so an icon can be rendered on the
 * server without dragging the whole icon package into the client bundle.
 */

import React from 'react'

type IconProps = {
  size?: number
  className?: string
  strokeWidth?: number
}

function Svg({
  size = 16,
  className,
  strokeWidth = 1.8,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const DashboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </Svg>
)

export const WalletIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
    <circle cx="16" cy="13" r="1.2" />
  </Svg>
)

export const StakingIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-8" />
    <path d="M22 19H2" />
  </Svg>
)

export const GovernanceIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z" />
    <path d="M12 3v6" />
    <path d="m9 6 3 3 3-3" />
  </Svg>
)

export const CascadeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 16.5a4 4 0 0 0-1.2-7.8A6 6 0 0 0 5.2 10 3.75 3.75 0 0 0 6 17.5" />
    <path d="M12 12v8" />
    <path d="m9 17 3 3 3-3" />
  </Svg>
)

export const FoundryIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m20 7.5-8 4.5-8-4.5" />
    <path d="M12 12v9" />
  </Svg>
)

export const FaucetIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h7a3 3 0 0 1 3 3v2" />
    <path d="M8 8V5.5" />
    <path d="M6 5.5h4" />
    <path d="M14 16c1.2 1.5 1.8 2.4 1.8 3.1a1.8 1.8 0 0 1-3.6 0c0-.7.6-1.6 1.8-3.1Z" />
  </Svg>
)

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Svg>
)

export const BellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
)

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
)

export const LockIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Svg>
)

export const AlertIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M12 9v4" />
    <path d="M12 17v.01" />
    <path d="M10.3 3.9 2.4 18a1.9 1.9 0 0 0 1.7 2.9h15.8a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" />
  </Svg>
)

export const CheckIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="m4 12.5 5.2 5.2L20 7" />
  </Svg>
)

export const CloseIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
)

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
)

export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M12 4v12" />
  </Svg>
)

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 11 5 5 5-5" />
    <path d="M12 16V4" />
  </Svg>
)

export const MenuIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Svg>
)

export const ChevronRight = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const ArrowLeft = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Svg>
)

export const PlusIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
)

export const FileIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3v5h5" />
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2Z" />
  </Svg>
)

export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
  </Svg>
)
