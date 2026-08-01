// Separate from vite.config.js on purpose: unit tests only exercise
// plain TS modules (no DOM, no PWA plugin, no build-time git/version
// metadata), so this stays minimal rather than risking any interaction
// with the app's own Vite build config.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // supabase/functions/** (Phase 2C's Edge Function) is Deno code,
    // but its request-handling/schema/prompt logic is deliberately
    // Deno-API-free (see import-ai-assistant/index.ts's own comment)
    // so it can be exercised directly here with the same Node/Vitest
    // setup as everything else, with only the few lines of actual
    // Deno.serve/Deno.env wiring left untested.
    include: ['src/**/__tests__/**/*.test.ts', 'supabase/functions/**/__tests__/**/*.test.ts'],
  },
});
