// src/components/shopping/CategoryDropdown.tsx
import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import { getCategoryStyle } from '../../theme/categoryStyles';
import { findMatchingCategory } from '../../utils/categoryMatching';

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  // Optional: when provided, a "+ Create category "<query>"" action
  // appears whenever the typed query doesn't exactly match (case/
  // whitespace-insensitively) an existing category. Only Smart
  // Import's ImportItemEditor passes this today - QuickAddBar's own
  // category picker omits it, so its behavior/design is unchanged.
  onCreateCategory?: (name: string) => void | Promise<void>;
}

// Search box only appears once there are enough categories that
// scanning the plain list stops being faster than typing.
const SEARCH_THRESHOLD = 6;

// Lightweight, anchored popover for picking a category from the Quick
// Add bar - deliberately NOT a full-screen modal/bottom sheet. Meant to
// be rendered by a `relative`-positioned parent; this component
// positions itself `absolute` relative to that anchor. Closes on
// selection, outside click, or Escape.
export default function CategoryDropdown({
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
  onCreateCategory,
}: CategoryDropdownProps) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

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

  // Only offered when the typed text doesn't already exactly match
  // (case/whitespace-insensitively - same rule addCategory itself
  // enforces) an existing category - never a second way to "create" a
  // category that's just an existing one under a different casing.
  const trimmedQuery = query.trim();
  const showCreateAction = Boolean(onCreateCategory) && trimmedQuery.length > 0 && !findMatchingCategory(categories, trimmedQuery);

  const handleCreate = async () => {
    if (!onCreateCategory || !trimmedQuery || creating) return;
    setCreating(true);
    await onCreateCategory(trimmedQuery);
    setCreating(false);
    onClose();
  };

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
        {/* Also shown below the search threshold when a create action is
            possible at all - a new category can't be typed without it,
            regardless of how few categories already exist. QuickAddBar
            never passes onCreateCategory, so its own threshold-gated
            behavior is unchanged. */}
        {(categories.length > SEARCH_THRESHOLD || onCreateCategory) && (
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
          {filtered.length === 0 && !showCreateAction ? (
            <p className="text-center text-sm text-gray-400 py-4">אין קטגוריות תואמות</p>
          ) : (
            <>
              {filtered.map((cat) => {
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
              })}
              {showCreateAction && (
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  disabled={creating}
                  onClick={handleCreate}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-right text-[14px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                  <span className="flex-shrink-0">+</span>
                  <span className="flex-1 min-w-0 truncate">
                    {creating ? 'יוצר קטגוריה...' : `צור קטגוריה "${trimmedQuery}"`}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
