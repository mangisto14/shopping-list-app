// src/components/shopping/AddItemSheet.tsx
import type { Category } from '../../hooks/useCategories';
import { getCategoryStyle } from './CategorySection';

// Static suggestion words for the quick-add chips. Purely presentational
// shortcuts that prefill the existing `value`/`onChange` input state -
// no new data source, no persistence, no business logic.
const QUICK_ADD_SUGGESTIONS = ['חלב', 'לחם', 'ביצים', 'בננות', 'עגבניות', 'יוגורט', 'גבינה', 'אבוקדו'];

interface AddItemSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  categories: Category[];
  categoryLabel: string;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  errorMessage?: string;
}

export default function AddItemSheet({
  open,
  onClose,
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  submitLabel,
  categories,
  categoryLabel,
  selectedCategory,
  onSelectCategory,
  errorMessage,
}: AddItemSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button aria-label="close" className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl shadow-lg p-5 pb-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            aria-label="close"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
          >
            ✕
          </button>
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        </div>

        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-400"
        />

        <div className="flex flex-wrap gap-2">
          {QUICK_ADD_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onChange(suggestion)}
              className="flex-shrink-0 rounded-full bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1.5 hover:bg-violet-100 hover:text-violet-700 transition-all"
            >
              + {suggestion}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">{categoryLabel}</p>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {categories.map((cat) => {
                const style = getCategoryStyle(cat.name);
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all border flex items-center gap-1 ${
                      active
                        ? `${style.fill} text-white border-transparent`
                        : `bg-white ${style.text} border-gray-200 hover:border-gray-300`
                    }`}
                  >
                    <span>{style.icon}</span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-sm font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errorMessage}
          </p>
        )}

        <button
          onClick={onSubmit}
          className="w-full bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl py-3 text-sm font-semibold hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
        >
          <span className="text-lg leading-none">+</span>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
