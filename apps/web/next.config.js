/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path')
const { withTamagui } = require('@tamagui/next-plugin')

const isDesktopExport = process.env.NEXT_OUTPUT === 'export'
const tamaguiConfigPath = path.resolve(__dirname, '../../tamagui.config.ts')

module.exports = withTamagui({
  config: tamaguiConfigPath,
  components: ['tamagui', '@tamagui/core', '@lumera-hub/ui'],
  disableExtraction: process.env.NODE_ENV === 'development',
  appDir: true,
})({
  reactStrictMode: true,
  transpilePackages: [
    'tamagui',
    '@tamagui/core',
    '@tamagui/lucide-icons',
    'react-native-web',
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
      include: /node_modules\/sdk-js-react/,
      type: 'javascript/auto',
    });

    // Turn off source maps in development to suppress missing .css.map requests
    if (dev) {
      config.devtool = false

      config.watchOptions = {
        ignored: /node_modules\/(?!(@tamagui|@lumera-hub|react-native-web))/,
      }
    }

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config
  },
  serverExternalPackages: ["typeorm", "sqlite3"],
})
