import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import base from './vite.config.ts';

export default mergeConfig(
  base,
  defineConfig({
    define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('mock') },
    build: {
      outDir: 'dist-performance',
      sourcemap: true,
      rolldownOptions: {
        input: [
          path.resolve(import.meta.dirname, 'e2e/performance/index.html'),
          path.resolve(import.meta.dirname, 'e2e/workspace/index.html'),
        ],
      },
    },
  }),
);
