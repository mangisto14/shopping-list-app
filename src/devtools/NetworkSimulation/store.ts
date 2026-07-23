// src/devtools/NetworkSimulation/store.ts
// Development/testing only - see interceptor.ts for how this actually
// affects network requests, and NetworkSimulationSection.tsx for the UI.
import { createDevStore } from '../shared/createDevStore';

export type NetworkMode = 'none' | 'offline' | 'slow-3g' | 'slow-wifi';

export interface NetworkSimulationSettings {
  mode: NetworkMode;
  // Disconnects the Supabase Realtime client while true. A separate
  // toggle from `mode` since "no realtime" and "slow/offline network"
  // are independently useful things to test.
  disableRealtime: boolean;
}

export const DEFAULT_NETWORK_SIMULATION_SETTINGS: NetworkSimulationSettings = {
  mode: 'none',
  disableRealtime: false,
};

export const networkSimulationStore = createDevStore('dev-settings:network', DEFAULT_NETWORK_SIMULATION_SETTINGS);

// Injected delay range per simulated mode, applied before letting a
// real fetch through (see interceptor.ts). Rough real-world figures,
// not a precise network model.
export const NETWORK_DELAY_MS: Record<NetworkMode, [number, number] | null> = {
  none: null,
  offline: null, // request is rejected outright, no delay needed
  'slow-3g': [1200, 2500],
  'slow-wifi': [200, 500],
};
