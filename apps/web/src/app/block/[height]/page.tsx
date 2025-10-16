// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { BlockDetailsScreen } from '@lumera-hub/ui/src/screens/BlockDetailsScreen';

export default function Page() {
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
