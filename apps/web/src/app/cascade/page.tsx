// apps/web/src/app/cascade/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import dynamic from 'next/dynamic';

import useCascade from '@/hooks/useCascade';

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

  const {
    isUploading,
    error,
    uploadResult,
    isFetchSumaryLoading,
    sumary,
    address,
    fileCounts,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    filteredFiles,
    markers,
    isDownloading,
    isMyFilesLoading,
    isMarkerLoading,
    handleDonwloadAllFile,
    handleDonwloadFile,
    handleSelectFile,
    handleSelectAll,
    handleFileSearchChange,
    handleFileTypeFilterChange,
    handleUploadCascade,
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
          isUploading={isUploading}
          error={error}
          uploadResult={uploadResult}
          isFetchSumaryLoading={isFetchSumaryLoading}
          sumary={sumary}
          address={address}
          fileCounts={fileCounts}
          fileTypeFilter={fileTypeFilter}
          fileSearch={fileSearch}
          selectedFiles={selectedFiles}
          filteredFiles={filteredFiles}
          markers={markers}
          isDownloading={isDownloading}
          isMyFilesLoading={isMyFilesLoading}
          isMarkerLoading={isMarkerLoading}
          onFileChange={handleUploadCascade}
          onFileTypeFilterChange={handleFileTypeFilterChange}
          onFileSearchChange={handleFileSearchChange}
          onSelectAll={handleSelectAll}
          onSelectFile={handleSelectFile}
          onDonwloadClick={handleDonwloadFile}
          onDonwloadAllFile={handleDonwloadAllFile}
        />
      </div>
    </>
  )
}
