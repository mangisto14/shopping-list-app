// src/devtools/Realtime/forceSync.ts
// "Force Sync" plumbing: the Developer Console's Force Sync button
// dispatches a DOM event that every data hook (useItems, useCategories,
// useMembers) listens for and responds to by re-running its own fetch -
// a manual refetch, independent of realtime, for verifying the UI
// matches the database right now.
import { useEffect } from 'react';
import { isDevToolsEnabled } from '../shared/gate';

const EVENT_NAME = 'dev-console:force-sync';

export function triggerForceSync(): void {
  window.dispatchEvent(new Event(EVENT_NAME));
}

// Callers (useItems, useCategories, useMembers) call this
// unconditionally - the isDevToolsEnabled() gate lives here, inside
// the hook, so a production build never registers the listener at all
// rather than relying on every call site to remember to guard it.
export function useForceSyncListener(onForceSync: () => void): void {
  useEffect(() => {
    if (!isDevToolsEnabled()) return;
    window.addEventListener(EVENT_NAME, onForceSync);
    return () => window.removeEventListener(EVENT_NAME, onForceSync);
  }, [onForceSync]);
}
