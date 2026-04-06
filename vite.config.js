import { defineConfig } from 'vite';

export default defineConfig({
  // 只有部署到 GitHub Pages 時才使用子路徑，本地開發使用 '/'
  base: process.env.NODE_ENV === 'production' ? '/hsinchu-maze-3d/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 如果不需要透過 5173 埠轉發 socket.io，可以關閉 proxy 以免 backend 沒開時導致崩潰
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:8888',
        ws: true,
        changeOrigin: true,
        // 加入錯誤處理，防止 backend 沒開時導致 Vite 崩潰
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // 靜默處理連接錯誤
          });
        }
      }
    }
  }
});
