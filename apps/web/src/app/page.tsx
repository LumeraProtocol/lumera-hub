// apps/web/src/app/page.tsx
'use client'
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'

export default function Page() {
  return (
    <div className="home-content">
      <HomeScreen address="2" />
    </div>
  )
}

