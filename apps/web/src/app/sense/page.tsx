// apps/web/src/app/sense/page.tsx
'use client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'

import { ComingSoonScreen, COMING_SOON } from '@lumera-hub/ui/src/screens/hub/ComingSoonScreen'

export default function Page() {
  useEffect(() => {
    document.title = 'Sense - Lumera Hub'
  }, [])

  return (
    <>
      <Helmet>
        <title>Sense - Lumera Hub</title>
      </Helmet>
      <ComingSoonScreen
        {...COMING_SOON.sense}
        capabilities={[...COMING_SOON.sense.capabilities]}
        links={[
          { label: 'Lumera documentation', href: 'https://docs.lumera.io/' },
          { label: 'Protocol updates on X', href: 'https://x.com/lumera' },
        ]}
      />
    </>
  )
}
