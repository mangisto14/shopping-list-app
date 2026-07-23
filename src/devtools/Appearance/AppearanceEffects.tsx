// src/devtools/Appearance/AppearanceEffects.tsx
// Mounted once at the app root (dev-gated, alongside UiDebugOverlay -
// see src/devtools/index.ts's DevToolsOverlay). Applies the Direction
// and Theme overrides to <html>. Does nothing when both are at their
// defaults ('auto' direction, 'light' theme is the app's existing look).
import { useEffect } from 'react';
import { appearanceStore } from './store';
import { useLanguage } from '../../LanguageContext';

export default function AppearanceEffects() {
  const appearance = appearanceStore.useValue();
  const { language } = useLanguage();

  // Direction override. 'auto' does nothing at all, deliberately -
  // src/LanguageContext.tsx already sets document.documentElement.dir
  // from the language on its own, and this devtools module must never
  // need to know about or duplicate that logic. When an explicit
  // rtl/ltr override IS active, it's re-asserted one frame after every
  // commit - after LanguageContext's own effect has already run for
  // this same render - so an override reliably wins even when language
  // and the override change together, without this module needing any
  // assumption about effect-ordering between two unrelated components.
  useEffect(() => {
    if (appearance.direction === 'auto') return;
    const id = requestAnimationFrame(() => {
      document.documentElement.dir = appearance.direction;
    });
    return () => cancelAnimationFrame(id);
  }, [appearance.direction, language]);

  // Theme: real, visible effect on native form controls/scrollbars via
  // `color-scheme` in supporting browsers, plus a `dark`/`light` class
  // on <html> for any component that does add dark: styling in future.
  // The app's own Tailwind components have no dark: variants today, so
  // this is foundational plumbing, not a full dark mode yet.
  useEffect(() => {
    const root = document.documentElement;
    const apply = (resolved: 'light' | 'dark') => {
      root.classList.toggle('dark', resolved === 'dark');
      root.classList.toggle('light', resolved === 'light');
      root.style.colorScheme = resolved;
    };

    if (appearance.theme !== 'system') {
      apply(appearance.theme);
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    apply(media.matches ? 'dark' : 'light');
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [appearance.theme]);

  return null;
}
