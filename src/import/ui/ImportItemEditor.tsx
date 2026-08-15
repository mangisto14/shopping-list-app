// src/import/ui/ImportItemEditor.tsx
// The Smart Import Preview's single, shared item editor. Exactly one
// instance of this component exists at a time (see ImportPreview.tsx,
// which renders it in place of the row list only while a candidate is
// selected) - replacing the previous design where every row mounted
// its own copy of this editor (kept `inert` while collapsed). That
// meant an import of 30-50 items had 30-50 full editors (every input,
// every button, every AI indicator) sitting in the DOM at all times.
// This is a real DOM-size and rendering-cost reduction: at most one
// editor's worth of nodes exists now, regardless of list size, which
// also gives any future AI feature (Phase 2B+) exactly one place to
// hook into rather than N.
//
// Same design-system primitives as before (QuantityStepper,
// CategoryDropdown, category colors) - this is a structural change,
// not a new visual language. Content is unchanged from the Phase 2A
// expanded row: name/quantity/unit/category/notes, per-field AI
// suggestion labels with a confidence indicator, pending-suggestion
// apply chips, duplicate/merge banner, and any validator warning.
import { useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { AiEnrichableField, ConfidenceLevel, ImportItemCandidate } from '../types';
import QuantityStepper from '../../components/ui/QuantityStepper';
import CategoryDropdown from '../../components/shopping/CategoryDropdown';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ImportItemEditorProps {
  candidate: ImportItemCandidate;
  categories: Category[];
  warning?: string;
  duplicateOfName?: string;
  onChange: (patch: Partial<ImportItemCandidate>) => void;
  onMergeIntoDuplicate?: () => void;
  onClose: () => void;
  // Same addCategory the Categories page already uses (see
  // useCategories.ts) - passed straight through, not wrapped in any
  // new data-access layer. Returns the created (or already-existing,
  // matched by name) category so it can be auto-selected below.
  onCreateCategory: (name: string) => Promise<Category | null>;
}

function confidenceEmoji(confidence: ConfidenceLevel): string {
  if (confidence === 'high') return '🟢';
  if (confidence === 'medium') return '🟡';
  return '🔴';
}

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
      className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
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

export default function ImportItemEditor({
  candidate,
  categories,
  warning,
  duplicateOfName,
  onChange,
  onMergeIntoDuplicate,
  onClose,
  onCreateCategory,
}: ImportItemEditorProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const style = getCategoryStyle(candidate.categoryName ?? undefined);
  const ai = candidate.aiSuggestions;

  return (
    <div className="flex flex-col gap-3 transition-opacity duration-150">
      <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
        <input
          type="checkbox"
          checked={candidate.included}
          onChange={(e) => onChange({ included: e.target.checked })}
          aria-label="כלול פריט זה בייבוא"
          className="w-[18px] h-[18px] flex-shrink-0 accent-blue-600"
        />
        <p className="flex-1 min-w-0 text-sm font-bold text-gray-800 truncate">{candidate.name}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה - חזרה לרשימה"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
        >
          ✕
        </button>
      </div>

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
              onCreateCategory={async (name) => {
                const created = await onCreateCategory(name);
                // Never selects on failure (created is null) - the
                // dropdown still closes (matching the normal-selection
                // flow), but the candidate's category is left exactly
                // as it was rather than silently pointing at nothing.
                if (created) onChange({ categoryId: created.id, categoryName: created.name });
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
  );
}
