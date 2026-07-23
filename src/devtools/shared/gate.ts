// src/devtools/shared/gate.ts
// The single source of truth for "is any part of devtools allowed to
// be visible/active right now". Every visible surface (route
// registration, menu entry, root-mounted effects, the console page
// itself) checks this independently, so a bug in any one layer still
// leaves the others closed.
export function isDevToolsEnabled(): boolean {
  return import.meta.env.DEV === true || import.meta.env.VITE_ENABLE_DEV_SETTINGS === 'true';
}
