// src/import/ui/ImportPreviewRow.tsx
// One editable candidate row in ImportPreview. Supports every field
// the approved design calls for: name, quantity, unit, category,
// notes, include/exclude. Reuses existing UI primitives
// (QuantityStepper, CategoryDropdown) rather than building new pickers.
import { useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { ImportItemCandidate } from '../types';
import QuantityStepper from '../../components/ui/QuantityStepper';
import CategoryDropdown from '../../components/shopping/CategoryDropdown';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ImportPreviewRowProps {
  candidate: ImportItemCandidate;
  categories: Category[];
  warning?: string;
  onChange: (patch: Partial<ImportItemCandidate>) => void;
}

export default function ImportPreviewRow({ candidate, categories, warning, onChange }: ImportPreviewRowProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const style = getCategoryStyle(candidate.categoryName ?? undefined);

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-opacity ${
        candidate.included ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={candidate.included}
          onChange={(e) => onChange({ included: e.target.checked })}
          aria-label="כלול פריט זה בייבוא"
          className="mt-1.5 w-[18px] h-[18px] flex-shrink-0 accent-blue-600"
        />

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <input
            type="text"
            value={candidate.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="שם הפריט"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <QuantityStepper
              quantity={candidate.quantity}
              onChange={(quantity) => onChange({ quantity })}
            />

            <input
              type="text"
              value={candidate.unit ?? ''}
              onChange={(e) => onChange({ unit: e.target.value || null })}
              placeholder="יחידה"
              className="w-20 flex-shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={categoryDropdownOpen}
                className={`h-8 rounded-full ${style.bg} ${style.text} text-xs font-semibold flex items-center gap-1 px-2.5`}
              >
                <span>{style.icon}</span>
                <span className="max-w-[80px] truncate">{candidate.categoryName ?? 'ללא קטגוריה'}</span>
              </button>

              {categoryDropdownOpen && (
                <CategoryDropdown
                  categories={categories}
                  selectedCategoryId={candidate.categoryId ?? ''}
                  onSelect={(id) => {
                    const selected = categories.find((c) => c.id === id) ?? null;
                    onChange({ categoryId: selected?.id ?? null, categoryName: selected?.name ?? null });
                  }}
                  onClose={() => setCategoryDropdownOpen(false)}
                />
              )}
            </div>
          </div>

          <input
            type="text"
            value={candidate.notes ?? ''}
            onChange={(e) => onChange({ notes: e.target.value || null })}
            placeholder="הערות (אופציונלי)"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {warning && <p className="text-[11px] font-medium text-amber-600">⚠️ {warning}</p>}
        </div>
      </div>
    </div>
  );
}
