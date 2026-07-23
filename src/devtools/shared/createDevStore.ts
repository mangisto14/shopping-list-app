// src/devtools/shared/createDevStore.ts
// One localStorage-backed, live-reactive store factory shared by every
// devtools domain (Swipe, Animations, FeatureFlags, DebugOverlay,
// Appearance, NetworkSimulation) - previously each domain hand-rolled
// its own copy of this exact useSyncExternalStore + localStorage
// read/write/notify boilerplate. Now it's written once.
import { useSyncExternalStore } from 'react';

export interface DevStore<T extends object> {
  get(): T;
  set(next: Partial<T>): void;
  resetField<K extends keyof T>(key: K): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
  useValue(): T;
  defaults: T;
  storageKey: string;
}

export function createDevStore<T extends object>(storageKey: string, defaults: T): DevStore<T> {
  function readStored(): T {
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }

  let current: T = readStored();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const get = () => current;

  const set = (next: Partial<T>) => {
    current = { ...current, ...next };
    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      // Storage unavailable/full - the in-memory value still applies
      // for this session, just won't survive a reload. Fine for a dev tool.
    }
    notify();
  };

  const resetField: DevStore<T>['resetField'] = (key) => set({ [key]: defaults[key] } as unknown as Partial<T>);

  const reset = () => {
    current = defaults;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // See set().
    }
    notify();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useValue = () => useSyncExternalStore(subscribe, get, () => defaults);

  return { get, set, resetField, reset, subscribe, useValue, defaults, storageKey };
}
