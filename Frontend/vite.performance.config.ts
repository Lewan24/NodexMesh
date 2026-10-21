import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import base from './vite.config.ts';

export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: 'dist-performance',
      sourcemap: true,
      rolldownOptions: { input: path.resolve(import.meta.dirname, 'e2e/performance/index.html') },
    },
  }),
);
