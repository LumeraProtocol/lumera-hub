// apps/web/src/app/sense/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { SenseScreen } from '@lumera-hub/ui/src/screens/SenseScreen';

export default function Page() {
  useEffect(() => {
    document.title = 'Sense';
  }, []);
  
  return (
    <>
      <Helmet>
        <title>Sense</title>
      </Helmet>
      <div className="sense-content">
        <SenseScreen />
      </div>
    </>
  )
}
