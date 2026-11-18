/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { swPlugin } from './scripts/vite-sw-plugin.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), swPlugin()],
  test: {
    globals: true,
    environment: 'node',
    // Engine tests run in plain Node; component tests opt into jsdom via a file-level comment.
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
