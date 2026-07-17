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
      className={`flex-shrink-0 h-[34px] rounded-full px-3.5 text-[13.5px] font-semibold transition-all duration-[120ms] border flex items-center gap-1 ${
        active
          ? `${activeClassName ?? 'bg-blue-600'} text-white border-transparent shadow-[0_3px_8px_rgba(37,99,235,0.22)]`
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
