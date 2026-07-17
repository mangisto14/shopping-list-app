// src/components/shopping/QuickAddBar.tsx
import { useState } from 'react';
import { getCategoryStyle } from '../../theme/categoryStyles';
import type { Category } from '../../hooks/useCategories';
import QuantityStepper from '../ui/QuantityStepper';
import CategoryDropdown from './CategoryDropdown';

interface QuickAddBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  categories: Category[];
  selectedCategoryId: string;
  selectedCategoryLabel: string;
  onSelectCategory: (id: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

// Docked "quick add" card pinned under the header, matching the Claude
// Design's main-list screen. Fires the same addItem()/addItemCategory
// state ShoppingList.tsx already threads through AddItemSheet - this is
// a second, faster entry point into the same flow, not a parallel one.
//
// The category chip opens a lightweight, self-contained CategoryDropdown
// right here - it does NOT open the full Add Item bottom sheet anymore.
// Selecting a category writes straight to the same addItemCategory state
// AddItemSheet uses, so the choice persists whichever entry point the
// item eventually gets submitted through. The sheet now opens only from
// the FAB.
//
// The quantity stepper has no backing `quantity` column on `items` (no
// schema change in scope here) - ShoppingList.tsx interprets it as "add
// this many copies," calling the existing addItem() hook function that
// many times. Purely a UI/orchestration choice, not a hook/query change.
export default function QuickAddBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  categories,
  selectedCategoryId,
  selectedCategoryLabel,
  onSelectCategory,
  quantity,
  onQuantityChange,
}: QuickAddBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const style = getCategoryStyle(selectedCategoryLabel);

  return (
    <div className="bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-11 bg-slate-50 border border-gray-100 rounded-[14px] px-3.5 text-[15px] font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={onSubmit}
          aria-label="add item"
          className="flex-shrink-0 w-11 h-11 rounded-[14px] bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.35)] active:scale-95 transition-all flex items-center justify-center text-2xl font-light"
        >
          +
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {categories.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              className={`h-9 rounded-full ${style.bg} ${style.text} text-sm font-semibold flex items-center gap-1.5 px-3.5`}
            >
              <span>{style.icon}</span>
              <span>{selectedCategoryLabel}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {dropdownOpen && (
              <CategoryDropdown
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelect={onSelectCategory}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        ) : (
          <span />
        )}

        <QuantityStepper quantity={quantity} onChange={onQuantityChange} />
      </div>
    </div>
  );
}
