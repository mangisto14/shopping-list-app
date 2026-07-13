// src/components/lists/EmptyListsState.tsx
interface EmptyListsStateProps {
  onCreateFirst: () => void;
}

export default function EmptyListsState({ onCreateFirst }: EmptyListsStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
      <p className="text-5xl mb-3">🛍️</p>
      <p className="text-gray-500 font-medium mb-4">אין עדיין רשימות</p>
      <button
        onClick={onCreateFirst}
        className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95"
      >
        <span>➕</span>
        צור רשימה ראשונה
      </button>
    </div>
  );
}
