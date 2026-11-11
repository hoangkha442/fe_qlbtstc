import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            /\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(
              id,
            )
          )
            return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
