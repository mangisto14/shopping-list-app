// src/devtools/NetworkSimulation/interceptor.ts
// Patches the global window.fetch exactly once, only when devtools is
// enabled (see the install call in devtools/hooks/useDevTools.tsx's
// provider mount effect) - a production build never calls this at all.
// Affects every fetch in the app while a mode is active, the same way
// a real browser's network-throttling devtools would, not just
// Supabase calls.
import { networkSimulationStore, NETWORK_DELAY_MS } from './store';

let installed = false;

function randomDelay([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

export function installNetworkInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const realFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const { mode } = networkSimulationStore.get();

    if (mode === 'offline') {
      throw new TypeError('Failed to fetch (simulated offline - Developer Console > Network Simulation)');
    }

    const delayRange = NETWORK_DELAY_MS[mode];
    if (delayRange) {
      await new Promise((resolve) => setTimeout(resolve, randomDelay(delayRange)));
    }

    return realFetch(...args);
  };
}
