// apps/web/src/app/page.tsx
'use client'
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'
import { ConnectWallet, WalletModalComponent } from '@/components/ConnectWallet'

export default function Page() {
  return (
    <>
      <HomeScreen />
      <div style={{ padding: 16 }}>
        <WalletModalComponent />
        <ConnectWallet />
      </div>
    </>
  )
}

