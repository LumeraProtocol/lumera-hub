// apps/web/src/app/staking/page.tsx
'use client'

import dynamic from 'next/dynamic'

import { CascadeScreen } from '@lumera-hub/ui/src/screens/CascadeScreen'

const JVectorMapWithNoSSR = dynamic(
  () => import('@react-jvectormap/core').then((mod) => mod.VectorMap),
  {
    ssr: false,
  }
);

export default function Page() {
  return (
    <div className="cascade-content">
      <CascadeScreen JVectorMapWithNoSSR={JVectorMapWithNoSSR} />
    </div>
  )
}
