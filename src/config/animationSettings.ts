// src/config/animationSettings.ts
// Dev/QA-only tuning for non-swipe animation timing. See devSettings.ts
// for the same pattern applied to swipe-to-delete, and
// DeveloperConsoleContext.tsx for how this is composed into one
// provider.
import { useSyncExternalStore } from 'react';

export interface AnimationSettings {
  // ms - BottomSheet.tsx's open/close slide + backdrop fade.
  bottomSheetDuration: number;
  // ms - how long the post-delete Undo snackbar/window stays up before
  // the deletion is committed (ShoppingList.tsx's UNDO_WINDOW_MS).
  snackbarDuration: number;
  // ms - FloatingAddButton.tsx's tap pulse/ping.
  fabAnimationDuration: number;
  // ms - CategorySection.tsx's expand/collapse transition.
  listItemAnimationDuration: number;
}

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  bottomSheetDuration: 250,
  snackbarDuration: 5000,
  fabAnimationDuration: 500,
  listItemAnimationDuration: 200,
};

const STORAGE_KEY = 'dev-settings:animations';

function readStored(): AnimationSettings {
  if (typeof window === 'undefined') return DEFAULT_ANIMATION_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ANIMATION_SETTINGS;
    return { ...DEFAULT_ANIMATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ANIMATION_SETTINGS;
  }
}

let current: AnimationSettings = readStored();
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

export function getAnimationSettings(): AnimationSettings {
  return current;
}

export function setAnimationSettings(next: Partial<AnimationSettings>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable/full - in-memory value still applies this session.
  }
  notify();
}

export function resetAnimationSettings() {
  current = DEFAULT_ANIMATION_SETTINGS;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See setAnimationSettings.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAnimationSettings(): AnimationSettings {
  return useSyncExternalStore(subscribe, getAnimationSettings, () => DEFAULT_ANIMATION_SETTINGS);
}
