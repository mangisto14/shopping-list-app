// src/components/shopping/FloatingAddButton.tsx
interface FloatingAddButtonProps {
  onClick: () => void;
}

export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="add item"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center text-3xl font-light"
    >
      +
    </button>
  );
}
