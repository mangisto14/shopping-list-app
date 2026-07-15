// src/components/ui/BottomSheet.tsx
import { useEffect, useState, type ReactNode } from 'react';

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
// Keyboard-safe sizing: mobile browsers don't shrink the layout
// viewport (the one `vh` units are based on) when the on-screen
// keyboard opens, so a plain `max-h-[75vh]` can end up taller than the
// space actually visible above the keyboard - hiding the input or CTA
// behind it. `visualViewport` reports the real visible height and
// updates live as the keyboard opens/closes, so the cap tracks it
// instead. Falls back to the static 75vh where visualViewport isn't
// available (older browsers) - progressive enhancement, not a
// requirement.
export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

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
    const update = () => setViewportHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [open]);

  if (!open) return null;

  const maxHeight = viewportHeight ? `${Math.round(viewportHeight * HEIGHT_FRACTION)}px` : '75vh';

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 transition-opacity duration-[250ms] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="bottom-sheet"
        style={{ maxHeight }}
        className={`relative w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-lg flex flex-col overflow-hidden transition-all duration-[250ms] ease-out ${
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
          className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0"
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
