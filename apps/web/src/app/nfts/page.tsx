// apps/web/src/app/nfts/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { NFTsScreen } from '@lumera-hub/ui/src/screens/NFTsScreen';

export default function Page() {
  useEffect(() => {
    document.title = 'NFTs - Lumera Hub';
  }, []);

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
