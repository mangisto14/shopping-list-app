// src/config/uiDebugSettings.ts
// Dev/QA-only visual debug toggles, applied globally by
// src/components/dev/UiDebugOverlay.tsx (mounted once, dev-gated, at
// the app root - see App.jsx).
import { useSyncExternalStore } from 'react';

export interface UiDebugSettings {
  showComponentBorders: boolean;
  showSafeAreaInsets: boolean;
  showTouchAreas: boolean;
  highlightRerenders: boolean;
  showLayoutGrid: boolean;
}

export const DEFAULT_UI_DEBUG_SETTINGS: UiDebugSettings = {
  showComponentBorders: false,
  showSafeAreaInsets: false,
  showTouchAreas: false,
  highlightRerenders: false,
  showLayoutGrid: false,
};

const STORAGE_KEY = 'dev-settings:uiDebug';

function readStored(): UiDebugSettings {
  if (typeof window === 'undefined') return DEFAULT_UI_DEBUG_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_UI_DEBUG_SETTINGS;
    return { ...DEFAULT_UI_DEBUG_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_UI_DEBUG_SETTINGS;
  }
}

let current: UiDebugSettings = readStored();
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

export function getUiDebugSettings(): UiDebugSettings {
  return current;
}

export function setUiDebugSettings(next: Partial<UiDebugSettings>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable/full - in-memory value still applies this session.
  }
  notify();
}

export function resetUiDebugSettings() {
  current = DEFAULT_UI_DEBUG_SETTINGS;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See setUiDebugSettings.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUiDebugSettings(): UiDebugSettings {
  return useSyncExternalStore(subscribe, getUiDebugSettings, () => DEFAULT_UI_DEBUG_SETTINGS);
}
