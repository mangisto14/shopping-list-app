// src/components/ui/CategoryChip.tsx
import { memo } from 'react';

interface CategoryChipProps {
  icon: string;
  label: string;
  active?: boolean;
  completed?: boolean;
  activeClassName?: string;
  onClick: () => void;
}

// Replaces the repeated category pill button in ShoppingList's filter
// row and AddItemSheet's category picker (same markup, only the
// active-state fill color differed per category via getCategoryStyle).
function CategoryChip({ icon, label, active = false, completed = false, activeClassName, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all border flex items-center gap-1 ${
        active
          ? `${activeClassName ?? 'bg-violet-500'} text-white border-transparent`
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      <span>{icon}</span>
      {label}
      {completed && <span className="text-xs">✓</span>}
    </button>
  );
}

export default memo(CategoryChip);
