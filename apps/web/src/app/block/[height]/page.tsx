// apps/web/src/app/block/[height]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { BlockDetailsScreen } from '@lumera-hub/ui/src/screens/BlockDetailsScreen';

export default function Page() {
  useEffect(() => {
    document.title = 'Block Details';
  }, []);

  return (
    <>
      <Helmet>
        <title>Block Details</title>
      </Helmet>
      <div className="sense-content">
        <BlockDetailsScreen />
      </div>
    </>
  )
}
