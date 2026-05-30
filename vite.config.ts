import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', '3DPO_Small_Logo.png'],
        manifest: {
          name: 'NTEC 3D Printing Office - 3DViewerPlus',
          short_name: '3DViewerPlus',
          description: 'A 3D Model Viewer and miniVSP for NTEC 3D Printing Office',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: './',
          icons: [
            {
              src: '3DPO_Small_Logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '3DPO_Small_Logo.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
