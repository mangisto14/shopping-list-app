// Separate from vite.config.js on purpose: unit tests only exercise
// plain TS modules (no DOM, no PWA plugin, no build-time git/version
// metadata), so this stays minimal rather than risking any interaction
// with the app's own Vite build config.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
