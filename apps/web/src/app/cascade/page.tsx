// apps/web/src/app/cascade/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import dynamic from 'next/dynamic'

import { CascadeScreen } from '@lumera-hub/ui/src/screens/CascadeScreen'

const JVectorMapWithNoSSR = dynamic(
  () => import('@react-jvectormap/core').then((mod) => mod.VectorMap),
  {
    ssr: false,
  }
);

export default function Page() {
  useEffect(() => {
    document.title = 'Cascade';
  }, []);

  return (
    <>
      <Helmet>
        <title>Cascade</title>
      </Helmet>
      <div className="cascade-content">
        <CascadeScreen JVectorMapWithNoSSR={JVectorMapWithNoSSR} />
      </div>
    </>
  )
}
