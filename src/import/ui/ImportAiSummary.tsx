// src/import/ui/ImportAiSummary.tsx
// Compact summary shown at the top of Preview, computed purely from
// data ImportService already produced (no new business logic - this
// is presentation only). Honest about what actually happened: if no
// AI engine ran (unavailable/failed - see ImportService's fail-safe
// handling), this renders a plain item count instead of claiming an
// "AI analysis" that never occurred.
import { useMemo } from 'react';
import type { ImportItemCandidate } from '../types';

interface ImportAiSummaryProps {
  candidates: ImportItemCandidate[];
  aiEngineId?: string;
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

export default function ImportAiSummary({ candidates, aiEngineId }: ImportAiSummaryProps) {
  const stats = useMemo(() => {
    let quantitiesCompleted = 0;
    let unitsCompleted = 0;
    let categoriesAssigned = 0;
    let namesCorrected = 0;
    let needsReview = 0;

    for (const c of candidates) {
      if (c.aiSuggestions?.quantity && c.aiPendingQuantity === undefined) quantitiesCompleted += 1;
      if (c.aiSuggestions?.unit && c.aiPendingUnit === undefined) unitsCompleted += 1;
      if (c.aiSuggestions?.category && c.aiPendingCategory === undefined) categoriesAssigned += 1;
      if (c.aiSuggestions?.name && c.aiPendingName === undefined) namesCorrected += 1;
      if (c.aiAmbiguous || hasPendingSuggestion(c) || c.aiDuplicateOfCandidateId) needsReview += 1;
    }

    return { quantitiesCompleted, unitsCompleted, categoriesAssigned, namesCorrected, needsReview };
  }, [candidates]);

  if (!aiEngineId) {
    return (
      <p className="text-xs font-semibold text-gray-500 transition-opacity duration-200">
        {candidates.length} פריטים זוהו
      </p>
    );
  }

  const bullets = [
    `${candidates.length} פריטים זוהו`,
    stats.quantitiesCompleted > 0 && `${stats.quantitiesCompleted} כמויות הושלמו`,
    stats.unitsCompleted > 0 && `${stats.unitsCompleted} יחידות הושלמו`,
    stats.categoriesAssigned > 0 && `${stats.categoriesAssigned} קטגוריות שויכו`,
    stats.namesCorrected > 0 && `${stats.namesCorrected} שמות תוקנו`,
    stats.needsReview > 0 && `${stats.needsReview} פריטים דורשים בדיקה`,
  ].filter((b): b is string => Boolean(b));

  return (
    <div className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-2 transition-opacity duration-200">
      <p className="text-xs font-bold text-purple-800 mb-1">🤖 ניתוח AI הושלם</p>
      <ul className="text-[11px] font-medium text-purple-700 space-y-0.5">
        {bullets.map((bullet) => (
          <li key={bullet}>• {bullet}</li>
        ))}
      </ul>
    </div>
  );
}
