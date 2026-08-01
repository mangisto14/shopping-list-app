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
    // src/import/learning/LearningRepository.ts (Phase 2C) imports the
    // real src/supabase/client.ts singleton, same as every hook already
    // does - createClient() throws immediately at import time without
    // a syntactically-valid URL/key. Every test that touches
    // ImportService (nearly all of them, transitively) would otherwise
    // fail before ever running a single assertion. Mirrors
    // playwright.config.ts's own FAKE_SUPABASE_URL for the identical
    // reason - no real network call is ever made from a Vitest run
    // either way (LearningRepository's own tests mock the client
    // module directly; ImportService's tests don't exercise
    // context.userId, so learningRepository's methods are never
    // actually invoked).
    env: {
      VITE_SUPABASE_URL: 'https://vitest-fake-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vitest-fake-anon-key',
    },
  },
});
