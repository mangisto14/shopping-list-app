// src/components/categories/CategoryCard.tsx
import { getCategoryStyle } from '../../theme/categoryStyles';
import type { Category } from '../../hooks/useCategories';

interface CategoryCardProps {
  category: Category;
  itemCount: number;
  onClick: () => void;
}

// Grid card for the Categories screen, matching the Claude Design:
// color accent bar + icon tile + name + item count. Tapping opens the
// rename/delete sheet (existing updateCategory/deleteCategory logic).
export default function CategoryCard({ category, itemCount, onClick }: CategoryCardProps) {
  const style = getCategoryStyle(category.name);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden text-right bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] px-3.5 pt-4 pb-3.5 flex flex-col gap-2.5 min-h-[44px] hover:shadow-md transition-shadow"
    >
      <span className={`absolute top-0 inset-x-0 h-1 ${style.fill}`} aria-hidden="true" />
      <span className={`w-11 h-11 rounded-2xl ${style.bg} flex items-center justify-center text-[22px]`}>
        {style.icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-bold text-gray-900 truncate">{category.name}</span>
        <span className="text-[12.5px] font-medium text-gray-500">{itemCount} פריטים</span>
      </span>
    </button>
  );
}
