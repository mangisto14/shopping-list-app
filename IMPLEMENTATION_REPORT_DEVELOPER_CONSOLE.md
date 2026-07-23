# Implementation Report: Developer Console

**Branch:** `fix/restore-invite-and-dev-settings` (off `develop` @ `01872d2`)
**Commits:** `6d7c193`, `22eec7b`, `292bf10`

Evolves the earlier Developer Settings screen into a full Developer Console with 9 sections, a reusable `DeveloperConsoleProvider` (React Context), and every setting wired to real app behavior.

## Visibility (unchanged contract, re-verified)

Gate: `import.meta.env.DEV || VITE_ENABLE_DEV_SETTINGS === 'true'`. Route stays at `/dev-settings` (URL kept stable); only the page content and menu label changed to "Developer Console".

Verified directly on the built bundle, not just by reading code:
- **Standard production build** (no flag): `grep` for `"Developer Console"`, `"Database Utilities"`, `"Reset All"`, `"Copy Debug Info"` on `dist/assets/*.js` → **0 matches**. The console isn't hidden, it's compiled out entirely.
- **Build with `VITE_ENABLE_DEV_SETTINGS=true`**: same strings present and the screen is reachable and functional.
- **`vite dev`**: reachable automatically, no flag needed (`import.meta.env.DEV` is true).

## Architecture

- `src/config/DeveloperConsoleContext.tsx` — the requested reusable `DeveloperConsoleProvider`, composing four independent domains. Mounted once in `main.tsx`, wrapping the whole app (cheap and safe unconditionally - only the *visible surfaces* for changing settings are gated, not reading them).
- Each domain is its own localStorage-backed external store (`useSyncExternalStore`), same pattern as the original swipe settings:
  - `src/config/devSettings.ts` — swipe (pre-existing, reused as-is)
  - `src/config/animationSettings.ts` — bottom sheet / snackbar / FAB / list-item durations
  - `src/config/uiDebugSettings.ts` — 5 visual debug toggles
  - `src/config/featureFlags.ts` — 6 feature toggles
- `src/config/realtimeDebugStore.ts` + `src/config/forceSync.ts` — dev-gated plumbing for the Realtime Debug section (last-event recording, force-sync event bus).
- `src/config/buildInfo.ts` + a `define` block in `vite.config.js` — git branch / build version / build date, inlined at build time.
- `src/pages/DeveloperConsole.tsx` — the console itself.
- `src/components/dev/UiDebugOverlay.tsx` — the one component that applies all 5 UI Debug toggles app-wide; no other component needed touching for that section.

## The 9 sections - what's real vs. display-only

| Section | Status |
|---|---|
| **1. Swipe Delete** | Real (unchanged from the previous pass, now read via the shared provider) |
| **2. Animations** | Real - wired into `BottomSheet.tsx`, `ShoppingList.tsx`'s undo window, `FloatingAddButton.tsx`, `CategorySection.tsx`. All defaults match the prior hardcoded values exactly, so default UI is unchanged. |
| **3. UI Debug** | Real - all 5 toggles work, applied globally via `UiDebugOverlay.tsx` (see below for how "Highlight Re-renders" works without React internals) |
| **4. Realtime Debug** | Real - live active list/user/list ID, live-polled connection state, last realtime event (recorded from `useRealtimeTable.ts`, dev-gated), working Reconnect and Force Sync buttons |
| **5. Feature Flags** | Real - all 6 gate actual code paths (details below); `enableExperimentalFeatures` is an honest placeholder with no consumer yet |
| **6. Local Storage** | Real - live key/value listing, Clear/Reset/Reset-Swipe all functional |
| **7. Database Utilities** | Real, Supabase-backed, gated *additionally* by `import.meta.env.DEV` specifically (see below) |
| **8. Environment** | Real - git branch/build version/date via `vite.config.js`, Supabase URL, and a mocked/live API-mode heuristic |
| **9. Performance** | Real, but deliberately scoped to the console page itself, not the whole app (see below) |

### Feature flags → real behavior

- `enableUndoSnackbar` → `ShoppingList.tsx`'s `scheduleRemoval` deletes immediately when off, skipping the soft-delete/undo window
- `enableHaptics` → gates the `navigator.vibrate()` call in `ItemCard.tsx`
- `enableEmailInvite` → `InviteMemberModal.tsx` renders only the share link when off
- `enableSwipeDelete` → `ItemCard.tsx` renders a non-swipeable row with a plain 🗑️ delete button instead (deletion stays possible, just not via swipe)
- `enableDemoAnimation` → gates the empty-list `DemoItemRow`; also fixed the empty-state fade-in's own `demoRowDone` initial value so turning this off doesn't leave the empty state permanently invisible
- `enableExperimentalFeatures` → no current consumer; exists so future work has a flag ready

### UI Debug, without instrumenting every component

All 5 implemented in `UiDebugOverlay.tsx`, mounted once at the app root:
- **Component borders** / **Touch areas**: global CSS classes toggled on `<html>` (`index.css`), zero per-component changes
- **Safe area insets**: 4 fixed colored bars sized via `env(safe-area-inset-*)`
- **Layout grid**: a fixed `repeating-linear-gradient` overlay
- **Highlight re-renders**: a `MutationObserver` on `document.body` (childList/characterData/a narrow attribute allowlist), flashing a CSS animation on mutated elements - approximates real re-renders via actual DOM change, not React internals. Deliberately excludes the `class` attribute from its own watch list to avoid retriggering on its own flash class.

### Database Utilities - stricter gate, verified

Section 7 requires `import.meta.env.DEV` *in addition to* the console's own gate - checked and confirmed: building with `VITE_ENABLE_DEV_SETTINGS=true` (a production-mode build, `DEV` false) includes the rest of the console but **not** "Database Utilities" (verified via `grep` on that build's output: 0 matches). This matters because a deployed preview environment could plausibly have the flag set; the destructive DB actions still can't reach it.

Actions: Seed Default Categories (idempotent - only inserts the default names missing from the active list), Create Demo Shopping List (`Demo List <timestamp>`), Archive Demo Lists, Reset Demo Data (delete). The latter two are scoped via `.ilike('name', 'Demo List%')` so they can only ever touch lists this same tool created, never a real user list. Archive/Reset both require `window.confirm()`.

### Performance - scoped, not app-wide

Render count, FPS, memory, and current route are all measured only while the console page itself is mounted - not injected into the wider app. Instrumenting every component to feed a global counter would be exactly the kind of always-on cost the "no production performance impact" requirement rules out; this way the app has zero added overhead outside the (already dev-gated, already-excluded-from-prod-bundles) console page.

## Testing

- `e2e/dev-settings.spec.ts` (standard build, flag off): hidden-in-production (route + menu), swipe-settings live-tuning (existing, unchanged), plus 2 new tests for `enableEmailInvite`/`enableSwipeDelete` actually changing behavior.
- `e2e/dev-console-live.spec.ts` (**new**): runs against a second, separate build+server (`playwright.config.ts` now has an array of 2 `webServer`s and a second `project`, port 4174, `VITE_ENABLE_DEV_SETTINGS=true`, own `dist-dev-console` output dir so it can't race the standard build). Drives the console's real UI:
  1. Console reachable with the flag set
  2. Changing `revealThreshold` in the console applies instantly (two bound inputs sync live) and survives a **client-side** navigation back to the shopping list with zero page reload (proven via a `window` marker that only a real reload would wipe - `framenavigated` events turned out to fire for client-side route changes too, so that approach was replaced)
  3. Settings persist across a real `page.reload()`

Found and fixed 3 test-design bugs during this work (all pre-existing-pattern bugs in my own new tests, not app bugs): two were the same "Undo snackbar text collides with a page-wide `getByText` substring search" issue already fixed once before in `interaction-regressions.spec.ts`; the third was the `framenavigated`-doesn't-mean-real-navigation discovery above.

Also fixed a real gap: the new `dist-dev-console` build output directory wasn't in `.eslintrc.cjs`'s `ignorePatterns` (only `dist` was), so `npm run lint` would fail if that build was still on disk. Added it, matching the existing `dist` entry and the `.gitignore` entry.

## Validation results

| Step | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` (standard, no flag) | ✅ succeeds; console fully absent from bundle |
| `npm run build` (`VITE_ENABLE_DEV_SETTINGS=true`) | ✅ succeeds; console present, Database Utilities correctly still absent (DEV-only) |
| `npm run lint` | ✅ 0 errors |
| Playwright, both projects | ✅ **32/32 passed** (29 existing/updated + 3 new in `dev-console-live.spec.ts`) |

### Verification checklist (from the task)

- **Console hidden in production** — ✅ confirmed via bundle inspection, not just a runtime check
- **Console visible in DEV** — ✅ confirmed live (`vite dev`, screenshot)
- **Console visible when `VITE_ENABLE_DEV_SETTINGS=true`** — ✅ confirmed via the dedicated build + e2e test
- **Live updates work without refresh** — ✅ confirmed two ways: (a) e2e test proving a setting changed on the console page is reflected in a different, freshly-mounted component after a client-side-only navigation, and (b) live screenshots of the search box filtering and the UI Debug overlay applying instantly
- **All settings persist after reload** — ✅ confirmed via e2e test and by design (every store reads from `localStorage` on init)

## Known issues / follow-ups

1. Same pre-existing items noted in earlier reports: `npm run lint`'s `.js/.jsx`-only scope (TypeScript files, including all the new ones here, are type-checked via `tsc` instead), and `supabase/.temp/` being tracked in git.
2. The Realtime Debug panel's "Connected Members" count is total list membership, not live presence (this app has no presence channel) - labeled honestly in the UI itself, not just in this report.
3. `enableExperimentalFeatures` has no consumer yet by design - ready for whatever's next.
4. The console's own CI cost is now two full builds instead of one (the second `webServer`/project). Acceptable for the coverage it buys (actually testing the enabled state, not just inferring it), but worth knowing if CI time becomes a concern later.

## Next steps

- Merge `fix/restore-invite-and-dev-settings` into `develop` when ready (not done - awaiting confirmation, consistent with this session's practice).
- If real presence tracking is ever added to the app, "Connected Members" in Realtime Debug should switch to reflect it.
