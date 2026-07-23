// src/config/buildInfo.ts
// Read-only build/environment metadata for the Developer Console's
// Environment panel. __GIT_BRANCH__/__BUILD_VERSION__/__BUILD_DATE__
// are inlined at build time by vite.config.js's `define` block - they
// are plain string constants in the shipped bundle, not runtime lookups.
export interface BuildInfo {
  environment: string;
  gitBranch: string;
  buildVersion: string;
  buildDate: string;
  supabaseUrl: string;
  apiMode: 'mocked' | 'live' | 'unconfigured';
}

function detectApiMode(supabaseUrl: string): BuildInfo['apiMode'] {
  if (!supabaseUrl) return 'unconfigured';
  // The e2e suite (playwright.config.ts) and any local test run point
  // at this exact placeholder host - every request to it is intercepted
  // by page.route() before leaving the browser. Any other host is a
  // real Supabase project.
  return supabaseUrl.includes('e2e-test-project') ? 'mocked' : 'live';
}

export function getBuildInfo(): BuildInfo {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  return {
    environment: import.meta.env.MODE,
    gitBranch: __GIT_BRANCH__,
    buildVersion: __BUILD_VERSION__,
    buildDate: __BUILD_DATE__,
    supabaseUrl,
    apiMode: detectApiMode(supabaseUrl),
  };
}
