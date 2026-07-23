# Refactoring Report: Developer Console → `src/devtools/` module

**Commits on `fix/restore-invite-and-dev-settings`:** module extraction, section changes, e2e updates

## Goal

Turn the Developer Console into a self-contained module the business app barely knows exists, so it can keep growing (new sections, new tools) without touching application code each time.

## New architecture

```
src/devtools/
├── index.ts                    ← the ONLY path the rest of the app may import from
├── DevToolsOverlay.tsx          one root-mounted component for every "applies everywhere" effect
├── hooks/
│   ├── useDevTools.tsx          DevToolsProvider + useDevTools() - the one Context business code reads
│   ├── useFavorites.ts          pin/unpin store
│   └── useConsoleFilter.ts      search + "Favorites only" visibility filter, shared by every section
├── shared/
│   ├── createDevStore.ts        generic localStorage-backed store factory (see below)
│   ├── controls.tsx             Section, SliderRow, ToggleRow, SelectRow, InfoRow, ActionButton
│   └── gate.ts                  isDevToolsEnabled()
├── DeveloperConsole/             the routed page + its shell (search bar, Reset All, Copy Debug Report)
├── Swipe/  Animations/  FeatureFlags/  Realtime/  Environment/  Storage/  DebugOverlay/
├── Appearance/                   new: Language, Direction, Theme
├── NetworkSimulation/            new: Offline/Slow 3G/Slow WiFi, Disable Realtime
└── MockData/                     new, non-destructive replacement for the removed Database Utilities
```

Every domain folder is symmetric: a `store.ts` (state) and a `*Section.tsx` (UI), sometimes a small effect component for things that must apply outside the console page itself (`UiDebugOverlay.tsx`, `AppearanceEffects.tsx`, `RealtimeGuard.tsx`).

### The boundary: what the app is allowed to import

Thirteen files outside `src/devtools/` touch it, and **every one of them imports only from `src/devtools` (`../devtools`), never a subfolder**:

| File | What it imports |
|---|---|
| `main.tsx` | `DevToolsProvider` |
| `App.jsx` | `isDevToolsEnabled`, `DeveloperConsolePage`, `DevToolsOverlay`, `useDevTools` (for Page Transition) |
| `HeaderMenu2.tsx` | `isDevToolsEnabled` |
| `ItemCard.tsx`, `ShoppingList.tsx`, `BottomSheet.tsx`, `FloatingAddButton.tsx`, `CategorySection.tsx`, `InviteMemberModal.tsx` | `useDevTools` |
| `useRealtimeTable.ts` | `isDevToolsEnabled`, `recordRealtimeEvent` |
| `useItems.ts`, `useCategories.ts`, `useMembers.ts` | `useForceSyncListener` |

Verified with a repo-wide search for the old `src/config/*` and `src/pages/DeveloperConsole` paths after the move: zero remaining references anywhere outside `src/devtools/` itself. Any future internal reshuffle inside `src/devtools/` (splitting a section, renaming a store file, adding a new domain folder) touches zero files outside the module, as long as `index.ts`'s exports stay the same.

### DRY-ed up the store boilerplate

Six domains previously (Swipe, Animations, FeatureFlags, UI Debug, Appearance, Network Simulation) each hand-rolled the same `useSyncExternalStore` + localStorage read/write/notify code. Extracted into one `shared/createDevStore.ts` factory - each domain's `store.ts` is now a ~15-line type + defaults + one `createDevStore(key, defaults)` call. This is a real simplification, not just a move: about 250 lines of duplicated boilerplate collapsed into one 70-line shared implementation.

### Search and Favorites share one mechanism

`hooks/useConsoleFilter.ts` backs both the search box and the new "Favorites only" toggle with a single `matches(label, id)` check - a row is visible when it passes both filters. No separate favorites-rendering path was needed.

## Section changes

### Kept, unchanged
Realtime Debug, Environment (relabeled field: raw Supabase URL → parsed **Supabase Project** ref), Local Storage view/Reset Preferences/Reset Swipe Settings, UI Debug (all 5 toggles).

### Kept, renamed/expanded
- **Swipe Settings**: same 4 fields, relabeled to match the requested naming (`Reveal Threshold`, `Reveal Duration`, `Auto Close Delay`, `Animation Duration`).
- **Animation Settings**: added **Page Transition** - genuinely wired into `App.jsx` as a real opacity fade on every route change (not a placeholder).
- **Feature Flags**: `Enable Demo Animation` → **Enable Demo Mode** (renamed field: `enableDemoAnimation` → `enableDemoMode` in `FeatureFlags/store.ts` and every consumer).
- **Local Storage**: added **Export Settings** (downloads a `devtools-settings.json` of every `dev-settings:*` key) and **Import Settings** (restores from that file, reloads to apply).

### New
- **Appearance** - Language (reads/writes the app's real `LanguageContext`, not a devtools-only duplicate), Direction (RTL/LTR override independent of language, for testing layout in the "wrong" direction - reasserted one frame after every render so it reliably wins even when language changes at the same time, without this module needing to know anything about `LanguageContext`'s internals), Theme (Light/Dark/System - applies `color-scheme` and a `dark`/`light` class to `<html>`, a real and visible effect on native form controls even though the app's own Tailwind components have no `dark:` styling yet - documented as foundational plumbing, not full dark mode, both in the hint text and here).
- **Network Simulation** - a real `window.fetch` patch (installed once, only when devtools is enabled) that rejects requests outright (Offline) or delays them (Slow 3G/WiFi), affecting every request in the app the same way a browser's own network throttling would; Disable Realtime drops the Supabase Realtime connection.
- **Mock Data** - replaces Database Utilities. Additive only: Create Demo Shopping List, Create Demo Categories (seeds any missing defaults into the active list), Create Demo Family (a fully-populated demo list, since client-side code has no way to create other real user accounts - documented honestly in the button's own result text).

### Removed entirely (not just hidden)
- **Database Utilities** - Archive/Reset Demo Data (the destructive parts) are gone; the one non-destructive action (seeding categories) survives as part of Mock Data.
- **Performance Monitor** - FPS, Render Counter, Memory Usage, and the code that measured them are deleted, not gated off. Verified: `grep` for "FPS"/"Render Count"/"Performance"/"Database Utilities" on a build with `VITE_ENABLE_DEV_SETTINGS=true` returns zero matches - these aren't reachable no matter how the flag is set, because the code no longer exists.

### Usability additions
- **Favorites**: a ☆/★ pin button on every interactive row; "Favorites only" in the header filters the whole console down to pinned settings.
- **Per-field Reset**: every slider/toggle/select now has its own "Reset" button next to the label, in addition to each section's "Restore Defaults".
- **Copy Debug Report**: renamed from "Copy Debug Info", same mechanism (clipboard, JSON), now includes every domain (previously missed Appearance/Network Simulation since they didn't exist yet).

## Production safety - re-verified, not assumed

Same three-layer gate as before (`import.meta.env.DEV || VITE_ENABLE_DEV_SETTINGS === 'true'`), now centralized in `shared/gate.ts`. Checked directly on the built output, not just by reading code:

- Standard build (no flag): `grep` for "Developer Console", "Mock Data", "Network Simulation", "Reset All" on `dist/assets/*.js` → **0 matches**.
- Build with `VITE_ENABLE_DEV_SETTINGS=true`: all of the above present and reachable; "Database Utilities", "FPS", "Performance", "Render Count" → **0 matches**, because that code was deleted, not gated.

## Validation

| Step | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` (standard, no flag) | ✅ succeeds; devtools fully absent from bundle |
| `npm run build` (`VITE_ENABLE_DEV_SETTINGS=true`) | ✅ succeeds; all kept/new sections present, removed sections absent |
| `npm run lint` | ✅ 0 errors (one new local component needed a `react/prop-types` disable comment - this project has no `prop-types` package and no other `.jsx` component declares them either, a pre-existing gap this just happened to be the first to surface) |
| Playwright, both projects | ✅ **36/36 passed** (30 existing/updated + 6 new: renamed-flag coverage, new-sections-render, search+favorites, per-field reset) |

Also live-verified visually: every section renders correctly with real, non-mocked data flowing through (git branch, build date, API mode all reflect the actual running build).

## Known issues / carried over from earlier reports
- `npm run lint`'s `.js/.jsx`-only scope (TypeScript files type-checked via `tsc` instead) - unchanged, pre-existing.
- `supabase/.temp/` tracked in git - unchanged, pre-existing, unrelated to this module.
- Theme is foundational plumbing today (native controls only); the app's own UI has no `dark:` styling yet.
- Network Simulation's realtime-disable only guarantees the *initial* drop; supabase-js may auto-reconnect on its own if a new channel subscribes afterward - documented in the section's own hint text.

## Next steps
- Merge `fix/restore-invite-and-dev-settings` into `develop` when ready.
- Future devtools sections/tools should live entirely under `src/devtools/<NewDomain>/`, exporting only through `index.ts` if the business app needs to read them - everything else can change freely without a wider review.
