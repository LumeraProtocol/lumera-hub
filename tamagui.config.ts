import { createTamagui, createTokens } from 'tamagui'
import * as v4 from '@tamagui/config/v4'

// The v4 preset module exports tokens/themes/fonts/shorthands directly
const preset: any = v4

const extraTokens = createTokens({
  color: {
    brand: '#7e5bef',
    background: '#0d1117',
  },
})

const config = createTamagui({
  ...preset,
  tokens: {
    ...(preset as any).tokens,
    ...extraTokens,
  },
  defaultTheme: 'dark',
})

export type AppConfig = typeof config
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
export default config
