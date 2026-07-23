// src/devtools/DebugOverlay/store.ts
import { createDevStore } from '../shared/createDevStore';

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

export const uiDebugStore = createDevStore('dev-settings:uiDebug', DEFAULT_UI_DEBUG_SETTINGS);
