'use client'

import './globals.css'
import React from 'react'
import { AppProvider } from '@lumera-hub/ui'
// import { useServerInsertedHTML } from 'next/navigation'
// import { getStyleElement } from 'tamagui'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // useServerInsertedHTML(() => <>{getStyleElement({})}</>)
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
