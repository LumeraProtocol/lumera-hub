// apps/web/src/app/page.tsx
'use client'
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'
import { ConnectWallet } from '@/components/ConnectWallet'

export default function Page() {
  return (
    <>
      <HomeScreen />
      <div style={{ padding: 16 }}>
        <ConnectWallet />
      </div>
    </>
  )
}

