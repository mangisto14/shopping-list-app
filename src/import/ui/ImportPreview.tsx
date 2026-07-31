// src/import/ui/ImportPreview.tsx
// Renders a ValidatedImportResult for review/editing before commit.
// Owns the local, editable copy of the candidate list - nothing is
// written to the real list until the user taps confirm.
import { useMemo, useState } from 'react';
import type { Category } from '../../hooks/useCategories';
import type { ImportItemCandidate, ValidatedImportResult } from '../types';
import ImportPreviewRow from './ImportPreviewRow';

interface ImportPreviewProps {
  result: ValidatedImportResult;
  categories: Category[];
  onConfirm: (candidates: ImportItemCandidate[]) => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function ImportPreview({ result, categories, onConfirm, onCancel, submitting }: ImportPreviewProps) {
  const [candidates, setCandidates] = useState<ImportItemCandidate[]>(result.candidates);

  const warningByCandidateId = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of result.issues) {
      if (!map.has(issue.candidateId)) map.set(issue.candidateId, issue.message);
    }
    return map;
  }, [result.issues]);

  const includedCount = candidates.filter((c) => c.included).length;

  const updateCandidate = (id: string, patch: Partial<ImportItemCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        לא זוהו פריטים. נסה/י טקסט אחר.
        <div className="mt-4">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            חזרה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {result.extractionWarnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-medium text-amber-700">
          {result.extractionWarnings.join(' · ')}
        </div>
      )}

      <p className="text-xs font-semibold text-gray-500">
        {candidates.length} פריטים זוהו · {includedCount} יתווספו לרשימה
      </p>

      <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto">
        {candidates.map((candidate) => (
          <ImportPreviewRow
            key={candidate.id}
            candidate={candidate}
            categories={categories}
            warning={warningByCandidateId.get(candidate.id)}
            onChange={(patch) => updateCandidate(candidate.id, patch)}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-60"
        >
          ביטול
        </button>
        <button
          onClick={() => onConfirm(candidates)}
          disabled={submitting || includedCount === 0}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.35)] hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {submitting ? 'מוסיף...' : `הוספת ${includedCount} פריטים`}
        </button>
      </div>
    </div>
  );
}
