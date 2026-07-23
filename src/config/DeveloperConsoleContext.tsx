// src/config/DeveloperConsoleContext.tsx
// Single reusable Context wrapping every dev/QA-tunable domain (swipe,
// animations, UI debug, feature flags). Each domain still keeps its
// own localStorage-backed external store (devSettings.ts,
// animationSettings.ts, uiDebugSettings.ts, featureFlags.ts) - that's
// what makes a change apply live everywhere instantly, with no prop
// drilling and no re-mount. This context is the single, reusable way
// the rest of the app (and DeveloperConsole.tsx itself) reads and
// writes all of them together.
//
// Mounted once, app-wide, in main.tsx - safe to do unconditionally
// (including for logged-out/production users): reading these settings
// has no cost, and every *visible* surface for changing them (the
// route, the menu entry) is separately gated by isDevSettingsEnabled().
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  DEFAULT_SWIPE_SETTINGS,
  isDevSettingsEnabled,
  resetSwipeSettings,
  setSwipeSettings,
  useSwipeSettings,
  type SwipeSettings,
} from './devSettings';
import {
  DEFAULT_ANIMATION_SETTINGS,
  resetAnimationSettings,
  setAnimationSettings,
  useAnimationSettings,
  type AnimationSettings,
} from './animationSettings';
import {
  DEFAULT_UI_DEBUG_SETTINGS,
  resetUiDebugSettings,
  setUiDebugSettings,
  useUiDebugSettings,
  type UiDebugSettings,
} from './uiDebugSettings';
import {
  DEFAULT_FEATURE_FLAGS,
  resetFeatureFlags,
  setFeatureFlags,
  useFeatureFlags,
  type FeatureFlags,
} from './featureFlags';

export type { SwipeSettings, AnimationSettings, UiDebugSettings, FeatureFlags };
export { isDevSettingsEnabled };

interface DeveloperConsoleContextValue {
  swipe: SwipeSettings;
  setSwipe: (next: Partial<SwipeSettings>) => void;
  resetSwipe: () => void;

  animations: AnimationSettings;
  setAnimations: (next: Partial<AnimationSettings>) => void;
  resetAnimations: () => void;

  uiDebug: UiDebugSettings;
  setUiDebug: (next: Partial<UiDebugSettings>) => void;
  resetUiDebug: () => void;

  featureFlags: FeatureFlags;
  setFeatureFlags: (next: Partial<FeatureFlags>) => void;
  resetFeatureFlags: () => void;

  // Restores every domain to its shipped default in one call - the
  // Developer Console's "Reset All" button.
  resetAll: () => void;
}

const DeveloperConsoleContext = createContext<DeveloperConsoleContextValue | null>(null);

export function DeveloperConsoleProvider({ children }: { children: ReactNode }) {
  const swipe = useSwipeSettings();
  const animations = useAnimationSettings();
  const uiDebug = useUiDebugSettings();
  const featureFlags = useFeatureFlags();

  const value = useMemo<DeveloperConsoleContextValue>(
    () => ({
      swipe,
      setSwipe: setSwipeSettings,
      resetSwipe: resetSwipeSettings,

      animations,
      setAnimations: setAnimationSettings,
      resetAnimations: resetAnimationSettings,

      uiDebug,
      setUiDebug: setUiDebugSettings,
      resetUiDebug: resetUiDebugSettings,

      featureFlags,
      setFeatureFlags: setFeatureFlags,
      resetFeatureFlags: resetFeatureFlags,

      resetAll: () => {
        resetSwipeSettings();
        resetAnimationSettings();
        resetUiDebugSettings();
        resetFeatureFlags();
      },
    }),
    [swipe, animations, uiDebug, featureFlags]
  );

  return <DeveloperConsoleContext.Provider value={value}>{children}</DeveloperConsoleContext.Provider>;
}

export function useDeveloperConsole(): DeveloperConsoleContextValue {
  const ctx = useContext(DeveloperConsoleContext);
  if (!ctx) throw new Error('useDeveloperConsole must be used within a DeveloperConsoleProvider');
  return ctx;
}

export { DEFAULT_SWIPE_SETTINGS, DEFAULT_ANIMATION_SETTINGS, DEFAULT_UI_DEBUG_SETTINGS, DEFAULT_FEATURE_FLAGS };
