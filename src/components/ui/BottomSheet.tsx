// src/components/ui/BottomSheet.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { useDeveloperConsole } from '../../config/DeveloperConsoleContext';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  // Optional footer region, rendered outside the scrollable body -
  // structurally pinned to the bottom of the sheet (not CSS `sticky`
  // inside a variable-height flex column, which is unreliable across
  // mobile browsers). Used for a CTA that must stay visible while the
  // body scrolls and while the on-screen keyboard is open.
  footer?: ReactNode;
}

const HEIGHT_FRACTION = 0.75; // 72-75vh target from the design spec

// Shared modal/bottom-sheet shell. Bottom sheet on mobile, centered
// dialog on larger screens; safe-area padding for iPhone Safari's home
// indicator.
//
// Keyboard-safe positioning: mobile browsers (iOS Safari in particular)
// don't shrink the *layout* viewport when the on-screen keyboard opens -
// the `100%`/`inset-0` a `position: fixed` element is measured against
// stays full-height, and the keyboard is simply drawn on top of it. A
// sheet anchored with `items-end` inside a plain `fixed inset-0`
// container therefore still anchors to the bottom of the *full,
// unshrunk* page - which is now behind the keyboard - even if the
// sheet's own height is capped correctly. `visualViewport` reports the
// actually-visible rectangle and updates live as the keyboard opens/
// closes/resizes; this repositions the whole overlay to match that
// rectangle (not just capping the sheet's height inside a stale one),
// so `items-end` lands the sheet's bottom edge at the top of the
// keyboard instead of behind it. Falls back to plain `inset-0` where
// `visualViewport` isn't available (older browsers) - progressive
// enhancement, not a requirement.
export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const { animations } = useDeveloperConsole();
  const [visible, setVisible] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setViewport({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [open]);

  if (!open) return null;

  const maxHeight = viewport ? `${Math.round(viewport.height * HEIGHT_FRACTION)}px` : '75vh';

  return (
    <div
      className={`fixed left-0 right-0 z-[60] flex items-end sm:items-center justify-center overflow-hidden bg-black/40 transition-opacity ${
        viewport ? '' : 'top-0 bottom-0'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        transitionDuration: `${animations.bottomSheetDuration}ms`,
        ...(viewport ? { top: viewport.offsetTop, height: viewport.height } : undefined),
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="bottom-sheet"
        style={{ maxHeight, transitionDuration: `${animations.bottomSheetDuration}ms` }}
        className={`relative w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-lg flex flex-col overflow-hidden transition-all ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-3">
          {title ? <h2 className="text-lg font-bold text-gray-800">{title}</h2> : <span />}
          <button
            onClick={onClose}
            aria-label="close"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
          >
            ✕
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 space-y-4 min-h-0"
          style={!footer ? { paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' } : { paddingBottom: 12 }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="flex-shrink-0 px-6 pt-3 bg-white"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
