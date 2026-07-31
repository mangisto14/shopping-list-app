// src/import/ui/ImportPreviewRow.tsx
// One editable candidate row in ImportPreview. Supports every field
// the approved design calls for: name, quantity, unit, category,
// notes, include/exclude. Reuses existing UI primitives
// (QuantityStepper, CategoryDropdown) rather than building new pickers.
//
// Phase 2 addition: displays AI-enriched data only, per the approved
// scope ("do not modify Preview except for displaying AI-enriched
// data") - no existing field's editing behavior changed. High/medium
// confidence suggestions are already written into the field above (by
// ImportService/applyAiEnrichments) by the time this renders, so they
// only need a "✨" badge; low confidence never touches the real field,
// so those render as a distinct "apply this suggestion?" chip instead.
import { useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { AiSuggestionMeta, ImportItemCandidate } from '../types';
import QuantityStepper from '../../components/ui/QuantityStepper';
import CategoryDropdown from '../../components/shopping/CategoryDropdown';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ImportPreviewRowProps {
  candidate: ImportItemCandidate;
  categories: Category[];
  warning?: string;
  duplicateOfName?: string;
  onChange: (patch: Partial<ImportItemCandidate>) => void;
  onMergeIntoDuplicate?: () => void;
}

// Small "✨" badge for a field the AI already populated (high/medium
// confidence). Medium is visually stronger ("highlighted", per the
// approved confidence rule) than high, which is just a quiet sparkle.
function AiBadge({ confidence }: { confidence: AiSuggestionMeta['confidence'] }) {
  return (
    <span
      title={confidence === 'medium' ? 'הצעת AI - כדאי לבדוק' : 'הוצע על ידי AI'}
      className={`inline-flex items-center text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
        confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-purple-50 text-purple-600'
      }`}
    >
      ✨
    </span>
  );
}

// A low-confidence suggestion the user must explicitly apply - never
// silently written into the field above it.
function PendingSuggestionChip({ label, onApply }: { label: string; onApply: () => void }) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-full px-2 py-1 transition-colors"
    >
      <span>✨ הצעה: {label}</span>
      <span className="underline">החל</span>
    </button>
  );
}

export default function ImportPreviewRow({
  candidate,
  categories,
  warning,
  duplicateOfName,
  onChange,
  onMergeIntoDuplicate,
}: ImportPreviewRowProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const style = getCategoryStyle(candidate.categoryName ?? undefined);
  const ai = candidate.aiSuggestions;

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-opacity ${
        candidate.included ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
      } ${candidate.aiAmbiguous ? 'ring-1 ring-amber-300' : ''}`}
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
          {candidate.aiAmbiguous && (
            <span className="self-start text-[11px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              ⚠️ פריט לא ברור - כדאי לבדוק
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={candidate.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="שם הפריט"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {ai?.name && <AiBadge confidence={ai.name.confidence} />}
          </div>
          {candidate.aiPendingName !== undefined && (
            <PendingSuggestionChip
              label={candidate.aiPendingName}
              onApply={() => onChange({ name: candidate.aiPendingName, aiPendingName: undefined })}
            />
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <QuantityStepper quantity={candidate.quantity} onChange={(quantity) => onChange({ quantity })} />
              {ai?.quantity && <AiBadge confidence={ai.quantity.confidence} />}
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={candidate.unit ?? ''}
                onChange={(e) => onChange({ unit: e.target.value || null })}
                placeholder="יחידה"
                className="w-20 flex-shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {ai?.unit && <AiBadge confidence={ai.unit.confidence} />}
            </div>

            <div className="relative flex-shrink-0 flex items-center gap-1">
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
              {ai?.category && <AiBadge confidence={ai.category.confidence} />}

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
          {candidate.aiPendingUnit !== undefined && (
            <PendingSuggestionChip
              label={candidate.aiPendingUnit}
              onApply={() => onChange({ unit: candidate.aiPendingUnit, aiPendingUnit: undefined })}
            />
          )}
          {candidate.aiPendingCategory !== undefined && (
            <PendingSuggestionChip
              label={candidate.aiPendingCategory.name ?? 'ללא קטגוריה'}
              onApply={() =>
                onChange({
                  categoryId: candidate.aiPendingCategory?.id ?? null,
                  categoryName: candidate.aiPendingCategory?.name ?? null,
                  aiPendingCategory: undefined,
                })
              }
            />
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={candidate.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value || null })}
              placeholder="הערות (אופציונלי)"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {ai?.notes && <AiBadge confidence={ai.notes.confidence} />}
          </div>
          {candidate.aiPendingNotes !== undefined && (
            <PendingSuggestionChip
              label={candidate.aiPendingNotes}
              onApply={() => onChange({ notes: candidate.aiPendingNotes, aiPendingNotes: undefined })}
            />
          )}

          {duplicateOfName && (
            <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] font-medium text-blue-700">🔁 דומה ל"{duplicateOfName}"</span>
              {onMergeIntoDuplicate && (
                <button
                  type="button"
                  onClick={onMergeIntoDuplicate}
                  className="text-[11px] font-bold text-blue-700 underline flex-shrink-0"
                >
                  מיזוג
                </button>
              )}
            </div>
          )}

          {warning && <p className="text-[11px] font-medium text-amber-600">⚠️ {warning}</p>}
        </div>
      </div>
    </div>
  );
}
