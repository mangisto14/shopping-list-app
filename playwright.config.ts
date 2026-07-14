import { defineConfig, devices } from '@playwright/test';

// E2E tests run entirely against a mocked Supabase backend (see
// e2e/fixtures.ts) - no live Supabase project or secrets are required,
// matching this repo's existing CI philosophy (see ci.yml). The
// VITE_SUPABASE_URL below only needs to be a syntactically valid URL
// for the client to construct without throwing; every actual request
// to it is intercepted by page.route() in each test before it ever
// leaves the browser.
const FAKE_SUPABASE_URL = 'https://e2e-test-project.supabase.co';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Opt-in only: unset in CI and on a normal `npx playwright
        // install` setup, where Playwright resolves its own installed
        // browser as usual. Lets a sandboxed dev environment with a
        // pre-installed, differently-versioned browser point at it
        // explicitly instead of downloading a second copy.
        launchOptions: process.env.PLAYWRIGHT_LOCAL_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_LOCAL_EXECUTABLE_PATH }
          : {},
      },
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: FAKE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: 'e2e-test-anon-key',
    },
  },
});
