// apps/web/src/app/cascade/page.tsx
'use client'
import { Helmet } from 'react-helmet-async'
import dynamic from 'next/dynamic'

// The container pulls in the Lumera WASM SDK, which has no server build.
const CascadeContainer = dynamic(() => import('@/components/hub/CascadeContainer'), {
  ssr: false,
})

export default function Page() {
  return (
    <>
      <Helmet>
        <title>Cascade - Lumera Hub</title>
      </Helmet>
      <CascadeContainer />
    </>
  )
}
