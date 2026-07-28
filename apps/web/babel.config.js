const path = require('path')

module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      '@tamagui/babel-plugin',
      {
        config: path.resolve(__dirname, '../../tamagui.config.ts'),
        components: ['tamagui'],
      },
    ],
  ],
}
