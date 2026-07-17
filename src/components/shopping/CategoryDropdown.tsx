// src/components/shopping/CategoryDropdown.tsx
import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// Search box only appears once there are enough categories that
// scanning the plain list stops being faster than typing.
const SEARCH_THRESHOLD = 6;

// Lightweight, anchored popover for picking a category from the Quick
// Add bar - deliberately NOT a full-screen modal/bottom sheet. Meant to
// be rendered by a `relative`-positioned parent; this component
// positions itself `absolute` relative to that anchor. Closes on
// selection, outside click, or Escape.
export default function CategoryDropdown({ categories, selectedCategoryId, onSelect, onClose }: CategoryDropdownProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.trim().toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  return (
    <>
      {/* Transparent outside-click catcher - no darkened backdrop, this
          is meant to feel like a lightweight menu, not a modal. */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div
        role="listbox"
        aria-label="בחר קטגוריה"
        className="absolute z-40 top-full mt-1.5 right-0 w-60 max-h-72 flex flex-col bg-white rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.08),0_12px_28px_rgba(15,23,42,0.12)] border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {categories.length > SEARCH_THRESHOLD && (
          <div className="flex-shrink-0 p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש קטגוריה..."
              className="w-full h-9 bg-slate-50 border border-gray-100 rounded-lg px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">אין קטגוריות תואמות</p>
          ) : (
            filtered.map((cat) => {
              const style = getCategoryStyle(cat.name);
              const selected = cat.id === selectedCategoryId;
              return (
                <button
                  key={cat.id}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(cat.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-right text-[14px] font-semibold transition-colors ${
                    selected ? style.bg + ' ' + style.text : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex-shrink-0">{style.icon}</span>
                  <span className="flex-1 min-w-0 truncate">{cat.name}</span>
                  {selected && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" className="flex-shrink-0" aria-hidden="true">
                      <path d="M1.5 5.5L5 9L12.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
