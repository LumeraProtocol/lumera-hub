'use client'

import React from 'react'
import { AppProvider } from '@lumera-hub/ui'

export default function UIAppProvider({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
