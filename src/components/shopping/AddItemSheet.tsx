// src/components/shopping/AddItemSheet.tsx
import type { Category } from '../../hooks/useCategories';
import { getCategoryStyle } from '../../theme/categoryStyles';
import BottomSheet from '../ui/BottomSheet';
import CategoryChip from '../ui/CategoryChip';
import QuantityStepper from '../ui/QuantityStepper';

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
  quantity: number;
  onQuantityChange: (quantity: number) => void;
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
  quantity,
  onQuantityChange,
  errorMessage,
}: AddItemSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex items-center gap-2.5">
        <QuantityStepper quantity={quantity} onChange={onQuantityChange} />
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_ADD_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onChange(suggestion)}
            className="flex-shrink-0 rounded-full bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 transition-all"
          >
            {suggestion} +
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">{categoryLabel}</p>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {categories.map((cat) => {
              const style = getCategoryStyle(cat.name);
              return (
                <CategoryChip
                  key={cat.id}
                  icon={style.icon}
                  label={cat.name}
                  active={selectedCategory === cat.id}
                  activeClassName={style.fill}
                  onClick={() => onSelectCategory(cat.id)}
                />
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
        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold shadow-[0_6px_14px_rgba(37,99,235,0.35)] hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
      >
        <span className="text-lg leading-none">+</span>
        {submitLabel}
      </button>
    </BottomSheet>
  );
}
