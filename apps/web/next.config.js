/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path')
const { withTamagui } = require('@tamagui/next-plugin')

const isDesktopExport = process.env.NEXT_OUTPUT === 'export'
const tamaguiConfigPath = path.resolve(__dirname, '../../tamagui.config.ts')

module.exports = withTamagui({
  config: tamaguiConfigPath,
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
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
    }
    return config
  },
})

