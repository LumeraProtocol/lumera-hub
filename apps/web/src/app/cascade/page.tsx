// apps/web/src/app/cascade/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import dynamic from 'next/dynamic';

import useCascade from '@/hooks/useCascade';
import { CascadeScreen } from '@lumera-hub/ui/src/screens/CascadeScreen';

const JVectorMapWithNoSSR = dynamic(
  () => import('@react-jvectormap/core').then((mod) => mod.VectorMap),
  {
    ssr: false,
  }
);

export default function Page() {
  const {
    handleUploadCascade,
    isUploading,
    error,
    uploadResult,
  } = useCascade();

  useEffect(() => {
    document.title = 'Cascade';
  }, []);

  return (
    <>
      <Helmet>
        <title>Cascade</title>
      </Helmet>
      <div className="cascade-content">
        <CascadeScreen
          JVectorMapWithNoSSR={JVectorMapWithNoSSR}
          onFileChange={handleUploadCascade}
          isUploading={isUploading}
          error={error}
          uploadResult={uploadResult}
        />
      </div>
    </>
  )
}
