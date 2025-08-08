// packages/ui/src/Provider.tsx
import React from 'react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'

export const AppProvider = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config} defaultTheme="dark">
    {children}
  </TamaguiProvider>
)
