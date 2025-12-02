// apps/web/src/app/inference/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { InferenceScreen } from '@lumera-hub/ui/src/screens/InferenceScreen';

export default function Page() {
  useEffect(() => {
    document.title = 'Inference - Lumera Hub';
  }, []);

  return (
    <>
      <Helmet>
        <title>Inference - Lumera Hub</title>
      </Helmet>
      <div className="inference-content">
        <InferenceScreen />
      </div>
    </>
  )
}
