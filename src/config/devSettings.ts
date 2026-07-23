// src/config/devSettings.ts
// Dev/QA-only tuning for interaction timing, currently just swipe-to-
// delete (ItemCard.tsx). Not for end users - gated by isDevSettingsEnabled()
// wherever it's surfaced in the UI (route, menu entry).
import { useSyncExternalStore } from 'react';

export interface SwipeSettings {
  // px - drag distance at which a released row snaps open to reveal
  // the delete action (half this distance is the minimum drag that
  // still counts as "open" rather than snapping back to closed).
  revealThreshold: number;
  // ms - transition duration for the row sliding open/closed.
  revealDuration: number;
  // ms - how long an open (revealed, undeleted) row waits before it
  // closes itself. 0 disables auto-close entirely, which is also
  // today's actual behavior (a row stays open until the user acts on
  // it) - kept as the default so this feature ships UI-unchanged.
  autoCloseDelay: number;
  // ms - duration of the delete slide/fade/collapse choreography.
  animationDuration: number;
}

export const DEFAULT_SWIPE_SETTINGS: SwipeSettings = {
  revealThreshold: 80,
  revealDuration: 180,
  autoCloseDelay: 0,
  animationDuration: 220,
};

const STORAGE_KEY = 'dev-settings:swipe';

function readStored(): SwipeSettings {
  if (typeof window === 'undefined') return DEFAULT_SWIPE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SWIPE_SETTINGS;
    return { ...DEFAULT_SWIPE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SWIPE_SETTINGS;
  }
}

let current: SwipeSettings = readStored();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSwipeSettings(): SwipeSettings {
  return current;
}

export function setSwipeSettings(next: Partial<SwipeSettings>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable/full - the in-memory value still applies for
    // this session, just won't survive a reload. Fine for a dev tool.
  }
  notify();
}

export function resetSwipeSettings() {
  current = DEFAULT_SWIPE_SETTINGS;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See setSwipeSettings.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Live-reactive read: ItemCard re-renders the instant a value changes
// in DevSettings, without needing a page reload - that's the whole
// point of exposing these as tunable rather than hardcoded.
export function useSwipeSettings(): SwipeSettings {
  return useSyncExternalStore(subscribe, getSwipeSettings, () => DEFAULT_SWIPE_SETTINGS);
}

// Dev/QA-only gate. True in any `vite dev` session (import.meta.env.DEV),
// or in a production build that was explicitly built with
// VITE_ENABLE_DEV_SETTINGS=true - never true in an ordinary production
// build, where neither condition holds.
export function isDevSettingsEnabled(): boolean {
  return import.meta.env.DEV === true || import.meta.env.VITE_ENABLE_DEV_SETTINGS === 'true';
}
