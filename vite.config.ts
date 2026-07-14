import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// Vite + React + TS + Module Federation (mirrors vault-theo/sigma vite.config.ts). The DMS file
// browser is exposed as the federated remote `dmsApp/DmsBrowser` so the Vault Origin shell — and
// other apps (Sigma) — mount it into their 1/10 rail (no iframe), while this same build still runs
// standalone as the dms-dev harness. Build output → `dist` (the SWA workflow deploys
// `output_location: "dist"`); the federation plugin emits `assets/remoteEntry.js` to consume.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'dmsApp',
      filename: 'remoteEntry.js',
      exposes: {
        './DmsBrowser': './src/DmsBrowser.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: { target: 'esnext' },
});
