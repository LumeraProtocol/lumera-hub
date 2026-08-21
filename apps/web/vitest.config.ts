import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match Next's automatic JSX runtime so components need no React import.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@interchain-ui/react/styles': path.resolve(__dirname, 'src/test/empty-style.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
