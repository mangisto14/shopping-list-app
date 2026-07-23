import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Build-time metadata for the Developer Console's Environment panel
// (src/config/buildInfo.ts). Best-effort: a shallow clone or a sandbox
// without git installed shouldn't fail the build over a debug label -
// each falls back to 'unknown' independently.
function gitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

function packageVersion() {
  try {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url))).version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __GIT_BRANCH__: JSON.stringify(gitBranch()),
    __BUILD_VERSION__: JSON.stringify(packageVersion()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'רשימת קניות משפחתית - Mangisto Shopping List',
        short_name: 'קניות משותפות',
        description: 'רשימת קניות משותפת בזמן אמת למשפחה ולשותפים לדירה.',
        lang: 'he',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#7c3aed',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-shell offline support: cache the built JS/CSS/HTML/icons so
        // the shell loads offline. Does not cache Supabase API responses -
        // this app is realtime/live-data by design, so serving stale
        // Supabase data from a cache would be misleading rather than
        // helpful. Offline users get the shell UI, not stale list data.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
