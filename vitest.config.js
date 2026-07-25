import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
  },
  resolve: {
    alias: {
      '@config': path.resolve('src/config.js'),
      '@utils': path.resolve('src/utils'),
      '@domains': path.resolve('src/domains'),
      '@models': path.resolve('src/models'),
      '@sheets': path.resolve('src/sheets'),
      '@hooks': path.resolve('src/hooks'),
      '@effects': path.resolve('src/effects'),
      '@documents': path.resolve('src/documents'),
      '@importer': path.resolve('src/importer'),
    },
  },
});
