// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { SenseScreen } from '@lumera-hub/ui/src/screens/SenseScreen';

export default function Page() {
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
