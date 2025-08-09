// types/tamagui.d.ts
type RootAppConfig = typeof import('../tamagui.config').default

declare module 'tamagui' {
  interface TamaguiCustomConfig extends RootAppConfig {}
}

export {}
