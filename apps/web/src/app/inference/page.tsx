// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { InferenceScreen } from '@lumera-hub/ui/src/screens/InferenceScreen';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>Inference</title>
      </Helmet>
      <div className="inference-content">
        <InferenceScreen />
      </div>
    </>
  )
}
