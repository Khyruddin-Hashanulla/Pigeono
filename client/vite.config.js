import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Don't intercept API/socket/upload traffic with the service worker
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/uploads/, /^\/sitemap\.xml/, /^\/robots\.txt/],
        runtimeCaching: [
          {
            urlPattern: /^\/uploads\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'listing-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: 'Pigeono — Pigeon Marketplace',
        short_name: 'Pigeono',
        description:
          "India's trusted pigeon marketplace — racing, high-flyer, show and breeding pigeons from verified lofts.",
        theme_color: '#1c1917',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        // Forward X-Forwarded-* headers so Express can tell whether the
        // original request arrived over HTTPS (needed for correct cookie flags)
        xfwd: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true, // WebSocket upgrade for Socket.io
      },
      '/sitemap.xml': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
