import React from 'react'
import { TamaguiProvider, type TamaguiInternalConfig } from 'tamagui'
import config from '../../../tamagui.config'

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Narrow "unknown" to the concrete internal config Tamagui expects
  const typedConfig = config as unknown as TamaguiInternalConfig<any, any, any, any, any, any, any>
  return (
    <TamaguiProvider config={typedConfig} defaultTheme="dark">
      {children}
    </TamaguiProvider>
  )
}

