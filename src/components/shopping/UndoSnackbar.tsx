// src/components/shopping/UndoSnackbar.tsx
import { useEffect, useState } from 'react';

interface UndoSnackbarProps {
  label: string;
  onUndo: () => void;
}

// Bottom snackbar shown for ~5s after a swipe-delete, giving the user a
// chance to undo before ShoppingList.tsx actually commits the deletion.
// Purely presentational - the undo window/timer itself lives in
// ShoppingList.tsx; this component only renders the current pending
// removal and forwards a tap on "בטל" (Undo).
export default function UndoSnackbar({ label, onUndo }: UndoSnackbarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="fixed left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md sm:max-w-lg md:max-w-2xl px-1"
      style={{
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        transform: `translateX(-50%) translateY(${visible ? '0' : '12px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 220ms ease-out, opacity 220ms ease-out',
      }}
    >
      <div className="flex items-center justify-between gap-3 bg-gray-900 text-white rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.25)] px-4 py-3">
        <span className="text-[14px] font-medium truncate">🗑 {label}</span>
        <button onClick={onUndo} className="flex-shrink-0 text-[14px] font-bold text-blue-300 hover:text-blue-200 active:scale-95 transition-transform">
          בטל
        </button>
      </div>
    </div>
  );
}
