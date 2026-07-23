// src/devtools/Appearance/store.ts
// Direction and Theme are dev-only overrides layered on top of the
// app's real language setting (src/LanguageContext.tsx, which the app
// already ships and uses for everyone - not duplicated here). Language
// itself is read/written directly via useLanguage() in
// AppearanceSection.tsx, not stored in this devtools-only store.
import { createDevStore } from '../shared/createDevStore';

export type DirectionOverride = 'auto' | 'rtl' | 'ltr';
export type Theme = 'light' | 'dark' | 'system';

export interface AppearanceSettings {
  // 'auto' (default) follows the app's own language->direction mapping
  // exactly as it already works today (he -> rtl, en -> ltr). 'rtl'/'ltr'
  // force a direction regardless of language, for testing layout in
  // the "wrong" direction for the current translation.
  direction: DirectionOverride;
  // Applies `dark`/`light` on <html> and the CSS `color-scheme`
  // property (real, visible effect on native form controls/scrollbars
  // in supporting browsers). The app's own Tailwind components have no
  // dark: variants yet, so this is foundational plumbing today, not a
  // full dark mode - see AppearanceSection.tsx's hint text.
  theme: Theme;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  direction: 'auto',
  theme: 'light',
};

export const appearanceStore = createDevStore('dev-settings:appearance', DEFAULT_APPEARANCE_SETTINGS);
