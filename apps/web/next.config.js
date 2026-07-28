/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path')
const { withTamagui } = require('@tamagui/next-plugin')

const isDesktopExport = process.env.NEXT_OUTPUT === 'export'
const tamaguiConfigPath = path.resolve(__dirname, '../../tamagui.config.ts')

module.exports = withTamagui({
  config: tamaguiConfigPath,
  components: ['tamagui'],
  appDir: true,
})({
  reactStrictMode: true,
  transpilePackages: [
    'tamagui',
    '@tamagui',
    'react-native',
    'react-native-web',
    '@lumera-hub/ui',
    '@lumera-protocol/sdk-js',
    '@cosmjs/proto-signing',
    '@cosmjs/stargate',
    'react-lumera-sdk'
  ],
  ...(isDesktopExport ? { output: 'export' } : {}),
  webpack: (config, { dev }) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
    }

    if (config.module.generator?.asset) {
      config.module.generator['asset/resource'] = { ...config.module.generator.asset };
      config.module.generator['asset/source'] = { ...config.module.generator.asset };
      delete config.module.generator.asset;
    }

    config.module.rules.unshift({
      test: /\.js$/,
      include: /node_modules\/react-lumera-sdk/,
      type: 'javascript/auto',
    });

    // Turn off source maps in development to suppress missing .css.map requests
    if (dev) {
      config.devtool = false
    }

    return config
  },
})
