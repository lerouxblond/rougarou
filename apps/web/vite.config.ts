import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180.png'],
      manifest: {
        name: 'Rougarou',
        short_name: 'Rougarou',
        description: 'Jouez au Loup-garou sans cartes ni papier.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Hors partie, l'app reste en theme nuit (`docs/06`).
        background_color: '#070A12',
        theme_color: '#070A12',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // L'API et le WebSocket ne sont jamais mis en cache (`docs/04`).
        navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    // Le budget de `docs/08` porte sur le JS initial : on garde des noms
    // stables pour que `scripts/check-bundle-size.mjs` sache quoi mesurer.
    target: 'es2023',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
