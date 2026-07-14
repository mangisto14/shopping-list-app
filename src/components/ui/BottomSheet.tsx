// src/components/ui/BottomSheet.tsx
import { useEffect, useState, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// Shared modal/bottom-sheet shell, replacing the two near-duplicate
// implementations previously hand-rolled in AddItemSheet.tsx and
// CreateListModal.tsx (backdrop, mount animation, Escape-to-close,
// slide-up panel). Bottom sheet on mobile, centered dialog on larger
// screens; safe-area padding for iPhone Safari's home indicator;
// scrolls internally so on-screen keyboards never push the submit
// button off-screen.
export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);

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

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className={`relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            aria-label="close"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
          >
            ✕
          </button>
          {title && <h2 className="text-lg font-bold text-gray-800">{title}</h2>}
        </div>

        {children}
      </div>
    </div>
  );
}
