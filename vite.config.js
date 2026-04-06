import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hsinchu-maze-3d/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:8888',
        ws: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:8888',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '')
      }
    }
  }
});
