import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import base from './vite.config.ts';

/** Isolated HTTP-adapter UI fixture. Playwright intercepts every API call. */
export default mergeConfig(
  base,
  defineConfig({
    define: {
      'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('http'),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1'),
    },
    build: {
      outDir: 'dist-guide',
      rolldownOptions: { input: path.resolve(import.meta.dirname, 'e2e/guide/index.html') },
    },
  }),
);
