// src/devtools/index.ts
// Public API of the devtools module. This is the ONLY path the rest of
// the application is allowed to import from - never a subfolder
// (src/devtools/Swipe/store, src/devtools/DebugOverlay/UiDebugOverlay,
// etc). That boundary is what makes this module grow independently of
// the business app: anything not re-exported here can be freely
// restructured without touching a single file outside src/devtools/.
//
// What the rest of the app actually needs, and why:
//   - DevToolsProvider   - wrap the app once (main.tsx)
//   - useDevTools        - read live swipe/animation/feature-flag
//                          settings (ItemCard, ShoppingList, BottomSheet,
//                          FloatingAddButton, CategorySection,
//                          InviteMemberModal)
//   - isDevToolsEnabled  - gate the route registration and menu entry
//                          (App.jsx, HeaderMenu2.tsx)
//   - DeveloperConsolePage - the routed page component
//   - DevToolsOverlay    - one root-mounted component for every
//                          "applies everywhere" effect (App.jsx)
//   - recordRealtimeEvent, useForceSyncListener - realtime data hooks
//     (useRealtimeTable, useItems, useCategories, useMembers) report
//     into / listen to devtools without depending on its internals
export { DevToolsProvider, useDevTools } from './hooks/useDevTools';
export type { SwipeSettings, AnimationSettings, FeatureFlags } from './hooks/useDevTools';
export { isDevToolsEnabled } from './shared/gate';
export { default as DeveloperConsolePage } from './DeveloperConsole/DeveloperConsolePage';
export { default as DevToolsOverlay } from './DevToolsOverlay';
export { recordRealtimeEvent } from './Realtime/eventStore';
export { useForceSyncListener } from './Realtime/forceSync';
