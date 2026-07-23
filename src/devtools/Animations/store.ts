// src/devtools/Animations/store.ts
import { createDevStore } from '../shared/createDevStore';

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
  // ms - fade duration for the route-swap transition in App.jsx.
  pageTransitionDuration: number;
}

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  bottomSheetDuration: 250,
  snackbarDuration: 5000,
  fabAnimationDuration: 500,
  listItemAnimationDuration: 200,
  pageTransitionDuration: 150,
};

export const animationsStore = createDevStore('dev-settings:animations', DEFAULT_ANIMATION_SETTINGS);
