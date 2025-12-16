// apps/web/src/app/cascade/page.tsx
'use client';

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import dynamic from 'next/dynamic';

import { UPLOAD_MAX_FILES } from '@/contants';

const JVectorMapWithNoSSR = dynamic(
  () => import('@react-jvectormap/core').then((mod) => mod.VectorMap),
  {
    ssr: false,
  }
);

const CascadeScreen = dynamic(
  () => import('@lumera-hub/ui/src/screens/CascadeScreen').then((mod) => mod.CascadeScreen),
  {
    ssr: false,
  }
);

export default function Page() {
  useEffect(() => {
    document.title = 'Cascade - Lumera Hub';
  }, []);

  return (
    <>
      <Helmet>
        <title>Cascade - Lumera Hub</title>
      </Helmet>
      <div className="cascade-content">
        <CascadeScreen
          JVectorMapWithNoSSR={JVectorMapWithNoSSR}
          maxFiles={Number(UPLOAD_MAX_FILES)}
        />
      </div>
    </>
  )
}
