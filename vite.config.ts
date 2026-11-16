import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,glb,wasm,png}'], maximumFileSizeToCacheInBytes: 8_000_000 },
      manifest: {
        name: 'MedAtlas – Medizin lernen', short_name: 'MedAtlas', lang: 'de', start_url: './', display: 'standalone',
        background_color: '#0f1218', theme_color: '#0f1218',
        description: 'Lern-App für Medizin: Ordnerbaum, 3D-Anatomie, Mindmaps, Leitfäden, Karteikarten.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  server: { host: true, port: 5173 },
});
