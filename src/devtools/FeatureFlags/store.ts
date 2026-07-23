// src/devtools/FeatureFlags/store.ts
// Each flag gates a real, existing app behavior - see FeatureFlagsSection.tsx
// for a short description of each, and the business components that
// read useDevTools().featureFlags for where it's actually applied.
// All default true (today's shipped behavior) except
// enableExperimentalFeatures, which has no consumer yet and exists so
// future experimental work has a flag ready to gate behind.
import { createDevStore } from '../shared/createDevStore';

export interface FeatureFlags {
  enableEmailInvite: boolean;
  enableUndoSnackbar: boolean;
  enableSwipeDelete: boolean;
  enableDemoMode: boolean;
  enableHaptics: boolean;
  enableExperimentalFeatures: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableEmailInvite: true,
  enableUndoSnackbar: true,
  enableSwipeDelete: true,
  enableDemoMode: true,
  enableHaptics: true,
  enableExperimentalFeatures: false,
};

export const featureFlagsStore = createDevStore('dev-settings:featureFlags', DEFAULT_FEATURE_FLAGS);
