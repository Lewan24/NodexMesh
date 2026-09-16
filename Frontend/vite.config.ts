import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },

  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 8443),
    strictPort: true,
    // Enable for shared folders / WSL where filesystem events may be unavailable.
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 200 } : undefined,
  },
});
