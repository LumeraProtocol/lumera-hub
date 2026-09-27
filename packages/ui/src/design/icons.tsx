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

// The Chat lab glyph from the v2 design — a single message-bubble path.
export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
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

/*
 * X's own glyphs, for the dashboard's post card.
 *
 * These are filled 24-grid paths taken from X's interface rather than
 * redrawings on the 1.8-stroke grid the rest of this file uses, because the
 * card is meant to read as an embed from X — approximations of a reply bubble
 * or a repost loop look immediately wrong next to the real thing.
 */

function Glyph({
  size = 14,
  className,
  path,
}: {
  size?: number
  className?: string
  path: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  )
}

export const ReplyIcon = (p: { size?: number; className?: string }) => (
  <Glyph
    {...p}
    path="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"
  />
)

export const RepostIcon = (p: { size?: number; className?: string }) => (
  <Glyph
    {...p}
    path="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"
  />
)

export const HeartIcon = (p: { size?: number; className?: string }) => (
  <Glyph
    {...p}
    path="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"
  />
)

/** The blue check. Its colour is X's, so it is set here rather than inherited. */
export const VerifiedIcon = ({ size = 15, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#1D9BF0"
    className={className}
    aria-label="Verified account"
    role="img"
  >
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
  </svg>
)

/* X's mark, for labelling where the posts come from. */
export function XIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25H8.08l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.02 4.13H5.05l12.03 15.64Z" />
    </svg>
  )
}
