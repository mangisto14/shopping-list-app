// src/config/realtimeDebugStore.ts
// Dev/QA-only "last realtime event" tracker. useRealtimeTable.ts calls
// recordRealtimeEvent() from each INSERT/UPDATE/DELETE handler, gated
// by isDevSettingsEnabled() so this is a no-op (not even called) in an
// ordinary production build - see that file for the call site.
import { useSyncExternalStore } from 'react';

export interface RealtimeEventLog {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  listId: string;
  at: string; // ISO timestamp
}

let lastEvent: RealtimeEventLog | null = null;
const listeners = new Set<() => void>();

export function recordRealtimeEvent(entry: Omit<RealtimeEventLog, 'at'>) {
  lastEvent = { ...entry, at: new Date().toISOString() };
  listeners.forEach((listener) => listener());
}

export function getLastRealtimeEvent(): RealtimeEventLog | null {
  return lastEvent;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLastRealtimeEvent(): RealtimeEventLog | null {
  return useSyncExternalStore(subscribe, getLastRealtimeEvent, () => null);
}
