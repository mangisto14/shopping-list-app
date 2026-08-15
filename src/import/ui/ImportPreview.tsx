// src/import/ui/ImportPreview.tsx
// Renders the Preview step's body: either the compact row list (with
// the sticky AI summary above it), or - when a row is selected - the
// single shared ImportItemEditor in its place. Candidate state itself
// is owned by ImportSheet (see that file) so the bottom action bar
// can live in BottomSheet's `footer` slot - structurally pinned
// outside the scrollable body, per that component's own documented
// reasoning against CSS `sticky` inside a variable-height flex column
// on mobile browsers. That warning is specifically about a *bottom*-
// pinned element fighting the on-screen keyboard's viewport resize -
// the AI summary here is *top*-pinned (`sticky top-0`) inside
// BottomSheet's own scrolling body, which has none of that keyboard-
// interaction risk and is a well-supported, common pattern, so it's
// used directly rather than needing its own structural slot.
import { useMemo } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { ImportItemCandidate, ValidatedImportResult } from '../types';
import ImportPreviewRow from './ImportPreviewRow';
import ImportAiSummary from './ImportAiSummary';
import ImportItemEditor from './ImportItemEditor';

interface ImportPreviewProps {
  result: ValidatedImportResult;
  candidates: ImportItemCandidate[];
  categories: Category[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string | null) => void;
  onUpdateCandidate: (id: string, patch: Partial<ImportItemCandidate>) => void;
  onMergeIntoDuplicate: (duplicateId: string, targetId: string) => void;
  onCreateCategory: (name: string) => Promise<Category | null>;
}

export default function ImportPreview({
  result,
  candidates,
  categories,
  selectedCandidateId,
  onSelectCandidate,
  onUpdateCandidate,
  onMergeIntoDuplicate,
  onCreateCategory,
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

  const selectedCandidate = selectedCandidateId ? candidateById.get(selectedCandidateId) ?? null : null;

  // Exactly one ImportItemEditor instance is ever mounted, only while
  // a row is selected - not one per row (see ImportPreviewRow.tsx).
  if (selectedCandidate) {
    const duplicateTargetId = selectedCandidate.aiDuplicateOfCandidateId;
    const duplicateTarget = duplicateTargetId ? candidateById.get(duplicateTargetId) : undefined;
    return (
      <ImportItemEditor
        candidate={selectedCandidate}
        categories={categories}
        warning={warningByCandidateId.get(selectedCandidate.id)}
        duplicateOfName={duplicateTarget?.name}
        onChange={(patch) => onUpdateCandidate(selectedCandidate.id, patch)}
        onMergeIntoDuplicate={
          duplicateTargetId ? () => onMergeIntoDuplicate(selectedCandidate.id, duplicateTargetId) : undefined
        }
        onClose={() => onSelectCandidate(null)}
        onCreateCategory={onCreateCategory}
      />
    );
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
        {candidates.map((candidate) => (
          <ImportPreviewRow
            key={candidate.id}
            candidate={candidate}
            onChange={(patch) => onUpdateCandidate(candidate.id, patch)}
            onSelect={() => onSelectCandidate(candidate.id)}
          />
        ))}
      </div>
    </div>
  );
}
