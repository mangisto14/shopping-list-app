// src/import/ui/ImportPreview.tsx
// Renders the scrollable body of the Preview step: the AI summary and
// the row list. Candidate state itself is owned by ImportSheet (see
// that file) so the bottom action bar can live in BottomSheet's
// `footer` slot - structurally pinned outside the scrollable body,
// per that component's own documented reasoning against CSS `sticky`
// inside a variable-height flex column on mobile browsers. That
// warning is specifically about a *bottom*-pinned element fighting
// the on-screen keyboard's viewport resize - the AI summary here is
// *top*-pinned (`sticky top-0`) inside BottomSheet's own scrolling
// body, which has none of that keyboard-interaction risk and is a
// well-supported, common pattern, so it's used directly rather than
// needing its own structural slot.
import { useMemo } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { ImportItemCandidate, ValidatedImportResult } from '../types';
import ImportPreviewRow from './ImportPreviewRow';
import ImportAiSummary from './ImportAiSummary';

interface ImportPreviewProps {
  result: ValidatedImportResult;
  candidates: ImportItemCandidate[];
  categories: Category[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUpdateCandidate: (id: string, patch: Partial<ImportItemCandidate>) => void;
  onMergeIntoDuplicate: (duplicateId: string, targetId: string) => void;
}

export default function ImportPreview({
  result,
  candidates,
  categories,
  expandedId,
  onToggleExpand,
  onUpdateCandidate,
  onMergeIntoDuplicate,
}: ImportPreviewProps) {
  const warningByCandidateId = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of result.issues) {
      if (!map.has(issue.candidateId)) map.set(issue.candidateId, issue.message);
    }
    return map;
  }, [result.issues]);

  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  if (candidates.length === 0) {
    return <div className="text-center py-8 text-sm text-gray-500">לא זוהו פריטים. נסה/י טקסט אחר.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky to the top of BottomSheet's own scrolling body - stays
          in place while only the row list beneath it scrolls. `bg-white`
          is required so scrolled-past rows don't show through underneath. */}
      <div className="sticky top-0 z-10 bg-white pb-2 flex flex-col gap-2">
        {result.extractionWarnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-medium text-amber-700">
            {result.extractionWarnings.join(' · ')}
          </div>
        )}

        <ImportAiSummary candidates={candidates} aiEngineId={result.aiEngineId} />
      </div>

      <div className="flex flex-col gap-2">
        {candidates.map((candidate) => {
          const duplicateTargetId = candidate.aiDuplicateOfCandidateId;
          const duplicateTarget = duplicateTargetId ? candidateById.get(duplicateTargetId) : undefined;
          return (
            <ImportPreviewRow
              key={candidate.id}
              candidate={candidate}
              categories={categories}
              warning={warningByCandidateId.get(candidate.id)}
              duplicateOfName={duplicateTarget?.name}
              expanded={expandedId === candidate.id}
              onToggleExpand={() => onToggleExpand(candidate.id)}
              onChange={(patch) => onUpdateCandidate(candidate.id, patch)}
              onMergeIntoDuplicate={
                duplicateTargetId ? () => onMergeIntoDuplicate(candidate.id, duplicateTargetId) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
