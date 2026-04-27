import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import pkg from './package.json';

// Gastify frontend — ported from BoletApp legacy with backend mocked at the
// Firebase SDK module boundary. Aliases below redirect `firebase/*` imports to
// in-memory + IndexedDB-backed shims under src/__firebase-mocks__/. To flip
// back to real Firebase later, comment out the firebase-* alias entries.
const firebaseMocks = path.resolve(__dirname, 'src/__firebase-mocks__');

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gastify',
        short_name: 'Gastify',
        description: 'Smart expense tracking with AI receipt scanning',
        theme_color: '#2d3a4a',
        background_color: '#f5f0e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 5174 },
  preview: { port: 4175 },
  resolve: {
    alias: {
      'firebase/app': path.resolve(firebaseMocks, 'app.ts'),
      'firebase/auth': path.resolve(firebaseMocks, 'auth.ts'),
      'firebase/firestore': path.resolve(firebaseMocks, 'firestore.ts'),
      'firebase/storage': path.resolve(firebaseMocks, 'storage.ts'),
      'firebase/functions': path.resolve(firebaseMocks, 'functions.ts'),
      'firebase/messaging': path.resolve(firebaseMocks, 'messaging.ts'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@managers': path.resolve(__dirname, 'src/managers'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
