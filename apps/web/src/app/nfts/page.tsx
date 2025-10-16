// apps/web/src/app/governance/page.tsx
'use client'
import { Helmet } from "react-helmet-async";

import { NFTsScreen } from '@lumera-hub/ui/src/screens/NFTsScreen';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>NFTs</title>
      </Helmet>
      <div className="nfts-content">
        <NFTsScreen />
      </div>
    </>
  )
}
