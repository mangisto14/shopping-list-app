// src/import/ui/ImportPreviewRow.tsx
// Phase 2A: a compact, Apple Reminders-style review row by default -
// checkbox, name, quantity+unit, category, and a single AI badge if
// AI touched anything. Tapping the row expands it (this row only -
// the parent controls which single row is open) to reveal the full
// editor: name/quantity/unit/category/notes, per-field AI suggestion
// labels with a confidence indicator, duplicate/merge banner, and any
// validator warning. Review is the default state; editing is one tap
// away, never the default view.
//
// Same design-system primitives as before (QuantityStepper,
// CategoryDropdown, category colors from theme/categoryStyles) - this
// is a layout/density change, not a new visual language.
import { useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { AiEnrichableField, ConfidenceLevel, ImportItemCandidate } from '../types';
import QuantityStepper from '../../components/ui/QuantityStepper';
import CategoryDropdown from '../../components/shopping/CategoryDropdown';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ImportPreviewRowProps {
  candidate: ImportItemCandidate;
  categories: Category[];
  warning?: string;
  duplicateOfName?: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<ImportItemCandidate>) => void;
  onMergeIntoDuplicate?: () => void;
}

function hasPendingSuggestion(candidate: ImportItemCandidate): boolean {
  return (
    candidate.aiPendingName !== undefined ||
    candidate.aiPendingQuantity !== undefined ||
    candidate.aiPendingUnit !== undefined ||
    candidate.aiPendingCategory !== undefined ||
    candidate.aiPendingNotes !== undefined
  );
}

function confidenceEmoji(confidence: ConfidenceLevel): string {
  if (confidence === 'high') return '🟢';
  if (confidence === 'medium') return '🟡';
  return '🔴';
}

// Per-field label shown only in the expanded editor - the compact row
// never shows field-level AI text, just one plain "✨ AI" badge (or a
// red one when something here needs review), per the approved design.
const AI_FIELD_LABELS: Record<AiEnrichableField, string> = {
  name: 'שם תוקן',
  quantity: 'כמות הושלמה',
  unit: 'יחידה הושלמה',
  category: 'קטגוריה שויכה',
  notes: 'הערה הוצעה',
};

function AiFieldIndicator({ field, confidence }: { field: AiEnrichableField; confidence: ConfidenceLevel }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-1.5 py-0.5 transition-opacity duration-150 ${
        confidence === 'low' ? 'bg-red-50 text-red-600' : confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-purple-50 text-purple-600'
      }`}
    >
      {confidenceEmoji(confidence)} {AI_FIELD_LABELS[field]}
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
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-full px-2 py-1 transition-colors"
    >
      <span>🔴 הצעה: {label}</span>
      <span className="underline">החל</span>
    </button>
  );
}

export default function ImportPreviewRow({
  candidate,
  categories,
  warning,
  duplicateOfName,
  expanded,
  onToggleExpand,
  onChange,
  onMergeIntoDuplicate,
}: ImportPreviewRowProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const style = getCategoryStyle(candidate.categoryName ?? undefined);
  const ai = candidate.aiSuggestions;
  const hasAiTouch = Boolean(ai && Object.keys(ai).length > 0);
  const needsReview = Boolean(candidate.aiAmbiguous || hasPendingSuggestion(candidate) || candidate.aiDuplicateOfCandidateId);

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-opacity ${
        candidate.included ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
    >
      {/* Compact header - the only thing visible by default. Target
          height ~64px, matching this app's existing row-height
          convention (see ItemCard.tsx's ROW_SHAPE). */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        aria-expanded={expanded}
        className="flex items-center gap-2.5 min-h-[64px] px-3 py-2 cursor-pointer select-none"
      >
        <input
          type="checkbox"
          checked={candidate.included}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ included: e.target.checked })}
          aria-label="כלול פריט זה בייבוא"
          className="w-[18px] h-[18px] flex-shrink-0 accent-blue-600"
        />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 truncate">{candidate.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
            <span className="flex-shrink-0 font-medium">
              {candidate.quantity}
              {candidate.unit ? ` ${candidate.unit}` : ''}
            </span>
            <span className="flex-shrink-0">·</span>
            <span className="flex items-center gap-0.5 min-w-0">
              <span className="flex-shrink-0">{style.icon}</span>
              <span className="truncate">{candidate.categoryName ?? 'ללא קטגוריה'}</span>
            </span>
          </div>
        </div>

        {hasAiTouch && (
          <span
            className={`flex-shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 transition-opacity duration-150 ${
              needsReview ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
            }`}
          >
            {needsReview ? '🔴' : '✨'} AI
          </span>
        )}

        <span
          className={`flex-shrink-0 text-gray-300 transition-transform duration-200 ${expanded ? '-rotate-90' : ''}`}
          aria-hidden="true"
        >
          ‹
        </span>
      </div>

      {/* Expanded editor. CSS grid-rows (0fr -> 1fr) animates smoothly
          to the content's natural height with no JS measurement -
          well-supported in iPhone Safari / Android Chrome. The
          content stays mounted while collapsed (required for the
          height to animate at all), so `inert` is essential here, not
          optional: without it, every row's hidden inputs/buttons would
          still be reachable by Tab and exposed to screen readers even
          though they're visually clipped to zero height. */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        {/* @ts-expect-error - `inert` is a valid DOM boolean attribute; @types/react@18 doesn't type it yet (added upstream for React 19) */}
        <div className="overflow-hidden" inert={!expanded ? '' : undefined}>
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={candidate.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="שם הפריט"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {ai?.name && <AiFieldIndicator field="name" confidence={ai.name.confidence} />}
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
                {ai?.quantity && <AiFieldIndicator field="quantity" confidence={ai.quantity.confidence} />}
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={candidate.unit ?? ''}
                  onChange={(e) => onChange({ unit: e.target.value || null })}
                  placeholder="יחידה"
                  className="w-20 flex-shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {ai?.unit && <AiFieldIndicator field="unit" confidence={ai.unit.confidence} />}
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
                {ai?.category && <AiFieldIndicator field="category" confidence={ai.category.confidence} />}

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
              {ai?.notes && <AiFieldIndicator field="notes" confidence={ai.notes.confidence} />}
            </div>
            {candidate.aiPendingNotes !== undefined && (
              <PendingSuggestionChip
                label={candidate.aiPendingNotes}
                onApply={() => onChange({ notes: candidate.aiPendingNotes, aiPendingNotes: undefined })}
              />
            )}

            {candidate.aiAmbiguous && (
              <span className="self-start text-[11px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                ⚠️ פריט לא ברור - כדאי לבדוק
              </span>
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
    </div>
  );
}
