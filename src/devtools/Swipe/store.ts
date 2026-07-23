// src/devtools/Swipe/store.ts
// Swipe-to-delete tuning, read live by src/components/shopping/ItemCard.tsx
// via the useDevTools() hook (src/devtools/hooks/useDevTools.tsx).
import { createDevStore } from '../shared/createDevStore';

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

export const swipeStore = createDevStore('dev-settings:swipe', DEFAULT_SWIPE_SETTINGS);
