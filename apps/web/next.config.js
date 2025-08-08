const { withTamagui } = require('@tamagui/next-plugin')

const isDesktopExport = process.env.NEXT_OUTPUT === 'export'

module.exports = withTamagui({
  config: '../../tamagui.config.ts',
  components: ['tamagui', '@lumera-hub/ui'],
  appDir: true,
})({
  reactStrictMode: true,
  transpilePackages: [
    'tamagui',
    '@tamagui',
    'react-native',
    'react-native-web',
    '@lumera-hub/ui'
  ],
  ...(isDesktopExport ? { output: 'export' } : {}),
})

