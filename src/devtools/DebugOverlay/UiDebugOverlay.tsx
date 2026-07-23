// src/devtools/DebugOverlay/UiDebugOverlay.tsx
// Renders every "UI Debug" toggle as a real, working visual aid.
// Mounted exactly once, at the app root, only when isDevToolsEnabled()
// - see src/devtools/index.ts's DevToolsOverlay and App.jsx. When
// every toggle is off (the default), this component does nothing
// observable: no classes are added, no overlay elements render, no
// observer is created.
import { useEffect, useRef } from 'react';
import { uiDebugStore } from './store';

const BORDERS_CLASS = 'dev-debug-borders';
const TOUCH_CLASS = 'dev-debug-touch';
const FLASH_CLASS = 'dev-debug-rerender-flash';
const FLASH_MS = 500;

export default function UiDebugOverlay() {
  const uiDebug = uiDebugStore.useValue();
  const observerRef = useRef<MutationObserver | null>(null);

  // Component borders / touch-area outlines: plain global CSS classes
  // (see index.css) toggled on <html>, so they apply to the whole app
  // without touching any individual component.
  useEffect(() => {
    document.documentElement.classList.toggle(BORDERS_CLASS, uiDebug.showComponentBorders);
  }, [uiDebug.showComponentBorders]);

  useEffect(() => {
    document.documentElement.classList.toggle(TOUCH_CLASS, uiDebug.showTouchAreas);
  }, [uiDebug.showTouchAreas]);

  // Highlight Re-renders: approximates "this element just re-rendered
  // with different output" via a MutationObserver rather than React
  // internals/profiler hooks - childList/characterData mutations catch
  // real content changes, and a narrow attributeFilter catches the
  // most common dynamic-prop cases (inline style, value, checked,
  // disabled) without including `class`, which this same effect
  // toggles on match - including it would make every flash retrigger
  // the observer on itself.
  useEffect(() => {
    if (!uiDebug.highlightRerenders) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const flashTimers = new Map<Element, number>();

    const flash = (el: Element) => {
      if (el.closest('[data-dev-overlay]')) return;
      window.clearTimeout(flashTimers.get(el));
      el.classList.remove(FLASH_CLASS);
      // Force reflow so re-adding the class restarts the CSS animation
      // even if it's still mid-flash from a very recent mutation.
      void (el as HTMLElement).offsetWidth;
      el.classList.add(FLASH_CLASS);
      flashTimers.set(
        el,
        window.setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS)
      );
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        const el = target instanceof Element ? target : target.parentElement;
        if (el) flash(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'value', 'checked', 'disabled'],
    });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      flashTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [uiDebug.highlightRerenders]);

  return (
    <div data-dev-overlay="true" aria-hidden="true">
      {uiDebug.showLayoutGrid && (
        <div
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(59,130,246,0.12) 0, rgba(59,130,246,0.12) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(to right, rgba(59,130,246,0.12) 0, rgba(59,130,246,0.12) 1px, transparent 1px, transparent 8px)',
          }}
        />
      )}

      {uiDebug.showSafeAreaInsets && (
        <>
          <div
            className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none bg-emerald-500/25 border-b border-emerald-500"
            style={{ height: 'env(safe-area-inset-top)' }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none bg-emerald-500/25 border-t border-emerald-500"
            style={{ height: 'env(safe-area-inset-bottom)' }}
          />
          <div
            className="fixed top-0 bottom-0 left-0 z-[9999] pointer-events-none bg-emerald-500/25 border-r border-emerald-500"
            style={{ width: 'env(safe-area-inset-left)' }}
          />
          <div
            className="fixed top-0 bottom-0 right-0 z-[9999] pointer-events-none bg-emerald-500/25 border-l border-emerald-500"
            style={{ width: 'env(safe-area-inset-right)' }}
          />
        </>
      )}
    </div>
  );
}
