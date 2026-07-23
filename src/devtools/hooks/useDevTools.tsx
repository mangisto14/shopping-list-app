// src/devtools/hooks/useDevTools.tsx
// The one Context the rest of the application is allowed to know about
// - every business component that needs a dev-tunable value
// (ItemCard.tsx, ShoppingList.tsx, BottomSheet.tsx, FloatingAddButton.tsx,
// CategorySection.tsx, InviteMemberModal.tsx) reads it via useDevTools(),
// imported from the top-level src/devtools barrel, never from a
// subfolder. Composes the three domains business code actually
// consumes (swipe, animations, feature flags); UI Debug/Appearance/
// Network Simulation are devtools-internal concerns with no business
// consumer, so their own sections read their stores directly instead
// of going through this context.
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { swipeStore, type SwipeSettings } from '../Swipe/store';
import { animationsStore, type AnimationSettings } from '../Animations/store';
import { featureFlagsStore, type FeatureFlags } from '../FeatureFlags/store';
import { uiDebugStore } from '../DebugOverlay/store';
import { appearanceStore } from '../Appearance/store';
import { networkSimulationStore } from '../NetworkSimulation/store';
import { installNetworkInterceptor } from '../NetworkSimulation/interceptor';
import { isDevToolsEnabled } from '../shared/gate';

export type { SwipeSettings, AnimationSettings, FeatureFlags };

interface DevToolsContextValue {
  swipe: SwipeSettings;
  animations: AnimationSettings;
  featureFlags: FeatureFlags;
  /** Resets every devtools domain to its shipped default in one call. */
  resetAll: () => void;
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

export function DevToolsProvider({ children }: { children: ReactNode }) {
  const swipe = swipeStore.useValue();
  const animations = animationsStore.useValue();
  const featureFlags = featureFlagsStore.useValue();

  // Installed once, only when devtools is reachable at all - a
  // production build never patches window.fetch.
  useEffect(() => {
    if (isDevToolsEnabled()) installNetworkInterceptor();
  }, []);

  const value = useMemo<DevToolsContextValue>(
    () => ({
      swipe,
      animations,
      featureFlags,
      resetAll: () => {
        swipeStore.reset();
        animationsStore.reset();
        featureFlagsStore.reset();
        uiDebugStore.reset();
        appearanceStore.reset();
        networkSimulationStore.reset();
      },
    }),
    [swipe, animations, featureFlags]
  );

  return <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>;
}

export function useDevTools(): DevToolsContextValue {
  const ctx = useContext(DevToolsContext);
  if (!ctx) throw new Error('useDevTools must be used within a DevToolsProvider');
  return ctx;
}
