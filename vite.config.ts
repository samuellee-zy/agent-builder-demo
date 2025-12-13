/**
 * @file vite.config.ts
 * @description Vite Build Configuration.
 * 
 * Configures:
 * 1. React Plugin for JSX support.
 * 2. Development Server Proxy:
 *    - Redirects `/api` requests to the local Express backend (port 8080).
 *    - Allows `npm run dev` (Vite) to work seamlessly with `node server/index.js`.
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy API requests to backend during development
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      // Intentionally left blank as we rely on backend proxy for secrets (ADC/Env).
      // We do NOT want to bake API keys into the client bundle.
    }
  };
});