// src/import/ui/ImportPreviewRow.tsx
// Compact row only - the Preview's default, review-first view.
// Checkbox, name, quantity+unit, category, and a single AI badge if
// AI touched anything. Nothing else lives here: editing (name/
// quantity/unit/category/notes, AI suggestion details, duplicate/
// merge banner, validator warning) happens in the single shared
// ImportItemEditor instance ImportPreview renders when a row is
// selected - not per-row, per the DOM-size/performance goal of this
// pass. Tapping anywhere on the row (other than the checkbox) opens
// that editor for this candidate.
import type { ImportItemCandidate } from '../types';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ImportPreviewRowProps {
  candidate: ImportItemCandidate;
  onChange: (patch: Partial<ImportItemCandidate>) => void;
  onSelect: () => void;
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

export default function ImportPreviewRow({ candidate, onChange, onSelect }: ImportPreviewRowProps) {
  const style = getCategoryStyle(candidate.categoryName ?? undefined);
  const ai = candidate.aiSuggestions;
  const hasAiTouch = Boolean(ai && Object.keys(ai).length > 0);
  const needsReview = Boolean(candidate.aiAmbiguous || hasPendingSuggestion(candidate) || candidate.aiDuplicateOfCandidateId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      // Target height ~64px, matching this app's existing row-height
      // convention (see ItemCard.tsx's ROW_SHAPE).
      className={`flex items-center gap-2.5 min-h-[64px] px-3 py-2 rounded-xl border cursor-pointer select-none transition-opacity ${
        candidate.included ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
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
          className={`flex-shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
            needsReview ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
          }`}
        >
          {needsReview ? '🔴' : '✨'} AI
        </span>
      )}

      <span className="flex-shrink-0 text-gray-300" aria-hidden="true">
        ‹
      </span>
    </div>
  );
}
