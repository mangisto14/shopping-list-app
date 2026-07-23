// src/config/featureFlags.ts
// Dev/QA-only feature toggles - each one gates a real, existing app
// behavior (see DeveloperConsole.tsx's Feature Flags section for where
// each is read). All default true (today's shipped behavior) except
// enableExperimentalFeatures, which has no consumer yet and exists so
// future experimental work has a flag ready to gate behind, rather
// than needing one invented under time pressure later.
import { useSyncExternalStore } from 'react';

export interface FeatureFlags {
  enableUndoSnackbar: boolean;
  enableHaptics: boolean;
  enableEmailInvite: boolean;
  enableSwipeDelete: boolean;
  enableDemoAnimation: boolean;
  enableExperimentalFeatures: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableUndoSnackbar: true,
  enableHaptics: true,
  enableEmailInvite: true,
  enableSwipeDelete: true,
  enableDemoAnimation: true,
  enableExperimentalFeatures: false,
};

const STORAGE_KEY = 'dev-settings:featureFlags';

function readStored(): FeatureFlags {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_FLAGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEATURE_FLAGS;
    return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}

let current: FeatureFlags = readStored();
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

export function getFeatureFlags(): FeatureFlags {
  return current;
}

export function setFeatureFlags(next: Partial<FeatureFlags>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable/full - in-memory value still applies this session.
  }
  notify();
}

export function resetFeatureFlags() {
  current = DEFAULT_FEATURE_FLAGS;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See setFeatureFlags.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(subscribe, getFeatureFlags, () => DEFAULT_FEATURE_FLAGS);
}
