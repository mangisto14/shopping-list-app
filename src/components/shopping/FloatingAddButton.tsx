// src/components/shopping/FloatingAddButton.tsx
interface FloatingAddButtonProps {
  onClick: () => void;
}

export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="add item"
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center text-3xl font-light"
    >
      +
    </button>
  );
}
