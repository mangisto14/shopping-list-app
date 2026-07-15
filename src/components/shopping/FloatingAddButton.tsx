// src/components/shopping/FloatingAddButton.tsx
interface FloatingAddButtonProps {
  onClick: () => void;
}

export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="add item"
      // 4rem clears BottomNav's fixed h-16 tab row (see that component);
      // env(safe-area-inset-bottom) + 1rem is the same gap this button
      // already reserved for iPhone's home indicator before BottomNav
      // existed - now stacked on top of the nav's own height instead of
      // directly on the screen edge.
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1rem)' }}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-16 h-16 rounded-full bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.42),0_2px_6px_rgba(37,99,235,0.3)] hover:shadow-lg active:scale-95 transition-all flex items-center justify-center text-3xl font-light"
    >
      +
    </button>
  );
}
