// src/utils/postLoginRedirect.ts
// Lets an unauthenticated visit to /invite/:token survive the login/
// register detour: the intended destination is remembered, then
// consumed once auth succeeds. sessionStorage (not localStorage) is
// deliberate - this is a short-lived intent for the current tab, not
// something that should persist across sessions or leak into a new
// unrelated one.
//
// Security note: only ever stores paths matching /^\/invite\/[^/]+$/ -
// this is the sole guard against an open redirect. Never store or
// honor an arbitrary path/URL here.
const STORAGE_KEY = 'shopping-list:postLoginRedirect';
const SAFE_PATH = /^\/invite\/[^/]+$/;

export function setPostLoginRedirect(path: string): void {
  if (!SAFE_PATH.test(path)) return;
  sessionStorage.setItem(STORAGE_KEY, path);
}

export function getAndClearPostLoginRedirect(): string | null {
  const path = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (path && SAFE_PATH.test(path)) return path;
  return null;
}
