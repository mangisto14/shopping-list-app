// src/components/lists/ListCard.tsx
// Named ListInfo, not ShoppingList (the task's example name) - that
// would collide with the existing ShoppingList page component and the
// existing ShoppingListSummary hook type. Same shape as requested.
export interface ListInfo {
  id: string;
  name: string;
  emoji: string;
  members: number;
  items: number;
}

interface ListCardProps {
  list: ListInfo;
  active?: boolean;
  onClick?: () => void;
}

export default function ListCard({ list, active, onClick }: ListCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
        active
          ? 'border-blue-400 bg-blue-50 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
      }`}
    >
      <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">
        {list.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate">{list.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {list.members} {list.members === 1 ? 'חבר' : 'חברים'} · {list.items} {list.items === 1 ? 'פריט' : 'פריטים'}
        </p>
      </div>
      {active && <span className="flex-shrink-0 text-blue-500 text-lg">✓</span>}
    </button>
  );
}
