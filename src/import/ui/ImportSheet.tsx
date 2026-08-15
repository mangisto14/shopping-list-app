// src/import/ui/ImportSheet.tsx
// The Smart Import flow's shell. Lists every registered source (all 8,
// per the approved design - unavailable ones show "Coming Soon" and
// are non-interactive, never hidden), then walks through
// pick source -> provide input -> preview -> commit.
//
// This component only ever imports from '../index' (the module's
// public barrel) and '../types' - never a concrete source/extractor/
// normalizer file. It doesn't know or care which one ran.
//
// Candidate state (and the merge action) lives here, not in
// ImportPreview, specifically so the bottom action bar can be passed
// to BottomSheet's `footer` slot - structurally pinned outside the
// scrollable body. BottomSheet's own header comment explains why: CSS
// `sticky` inside a variable-height flex column is unreliable on
// mobile browsers (iOS Safari in particular), so this reuses the
// mechanism the shared component already built for exactly this case,
// rather than reinventing pinning with `sticky`.
import { useEffect, useState } from 'react';
import BottomSheet from '../../components/ui/BottomSheet';
import { useCategories } from '../../hooks/useCategories';
import { useItems } from '../../hooks/useItems';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../LanguageContext';
import { importService } from '../index';
import type { ImportItemCandidate, ImportPipelineContext, ImportSourceId, ValidatedImportResult } from '../index';
import ImportPreview from './ImportPreview';
import ImportLoadingState from './ImportLoadingState';

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'source' | 'analyzing' | 'preview';

export default function ImportSheet({ open, onClose }: ImportSheetProps) {
  const { categories, addCategory } = useCategories();
  const { items, addItem } = useItems();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [step, setStep] = useState<Step>('source');
  const [sources, setSources] = useState<{ id: ImportSourceId; label: string; icon: string; available: boolean }[]>(
    []
  );
  const [pasteText, setPasteText] = useState('');
  const [result, setResult] = useState<ValidatedImportResult | null>(null);
  const [candidates, setCandidates] = useState<ImportItemCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setStep('source');
      setPasteText('');
      setResult(null);
      setCandidates([]);
      setSelectedCandidateId(null);
      setError('');
      return;
    }
    importService.listSources().then((list) => {
      setSources(
        list.map(({ meta, available }) => ({ id: meta.id, label: meta.labelHe, icon: meta.icon, available }))
      );
    });
  }, [open]);

  // Shared by both runImport (analyze) and saveLearning (confirm) -
  // userId/language (Phase 2C) are optional on ImportPipelineContext,
  // so a still-loading/logged-out user just means Learning/AI Assistant
  // are skipped (see ImportService.runImport's own graceful-degradation
  // handling), never an error here.
  const buildContext = (): ImportPipelineContext => ({
    existingCategories: categories.map((c) => ({ id: c.id, name: c.name })),
    existingItemNames: items.map((i) => i.name),
    userId: user?.id,
    language,
  });

  const handleAnalyze = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    setError('');
    // "Analyzing your shopping list..." - runImport now includes the
    // AI Analysis stage (typically ~1-5s per the approved design), so
    // this gets its own step/screen rather than just a disabled
    // button label, per the requested loading UX.
    setStep('analyzing');
    try {
      const validated = await importService.runImport('paste-text', buildContext(), { kind: 'text', text: pasteText });
      setResult(validated);
      setCandidates(validated.candidates);
      setStep('preview');
    } catch (err) {
      console.error('Smart Import: analyze failed', err);
      setError('לא ניתן היה לנתח את הטקסט. נסה/י שוב.');
      setStep('source');
    } finally {
      setLoading(false);
    }
  };

  const updateCandidate = (id: string, patch: Partial<ImportItemCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  // AI Analysis only ever suggests a merge - it never merges
  // automatically. This is the one explicit user action that performs
  // it: fold the duplicate's quantity into the row it matched, then
  // exclude the duplicate rather than deleting it outright (still
  // visible, still re-includable, nothing is silently lost).
  const mergeIntoDuplicate = (duplicateId: string, targetId: string) => {
    setCandidates((prev) => {
      const duplicate = prev.find((c) => c.id === duplicateId);
      if (!duplicate) return prev;
      return prev.map((c) => {
        if (c.id === targetId) return { ...c, quantity: c.quantity + duplicate.quantity };
        if (c.id === duplicateId) return { ...c, included: false, aiDuplicateOfCandidateId: null };
        return c;
      });
    });
  };

  const handleConfirm = async () => {
    if (!result) return;
    setSubmitting(true);
    try {
      // Merges into an existing active item with the same (post-edit)
      // name when one exists on the current list, instead of always
      // creating a fresh one - see ImportService.commit's own doc
      // comment for why this needs the list's real items, not just
      // their names.
      const existingItemsForMerge = items.map((i) => ({
        name: i.name,
        categoryId: i.category_id,
        unit: i.unit,
        notes: i.notes,
        isDone: i.is_done,
      }));
      await importService.commit({ ...result, candidates }, addItem, existingItemsForMerge);
      // Phase 2C, STEP5: diffs the pipeline's original output
      // (`result.candidates` - untouched, since `candidates` state was
      // always a separate copy updateCandidate mutates) against what
      // the user actually confirmed, storing only genuinely changed
      // fields. Never blocks/undoes the import that already succeeded
      // above - a learning-save failure is logged inside ImportService/
      // LearningRepository, never surfaced here.
      await importService.saveLearning(result.candidates, candidates, buildContext());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const includedCount = candidates.filter((c) => c.included).length;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="ייבוא חכם"
      footer={
        step === 'preview' && result ? (
          <div className="flex gap-2">
            <button
              onClick={() => setStep('source')}
              disabled={submitting}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-60"
            >
              ביטול
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || includedCount === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.35)] hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? 'מוסיף...' : `הוספת ${includedCount} פריטים`}
            </button>
          </div>
        ) : undefined
      }
    >
      {step === 'source' ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                disabled={!source.available}
                onClick={() => source.available && handleAnalyze()}
                className={`relative rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all ${
                  source.available
                    ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-[0.98]'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl">{source.icon}</span>
                <span className="text-xs font-semibold text-gray-700">{source.label}</span>
                {!source.available && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-gray-200 text-gray-500 rounded-full px-1.5 py-0.5">
                    בקרוב
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">הדבק/י רשימת פריטים (שורה לפריט)</label>
            <textarea
              autoFocus
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'חלב 3%\n2x לחם\n500 גרם עגבניות'}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !pasteText.trim()}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold shadow-[0_6px_14px_rgba(37,99,235,0.35)] hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? 'מנתח...' : 'ניתוח פריטים'}
          </button>
        </div>
      ) : step === 'analyzing' ? (
        <ImportLoadingState message="מנתח את רשימת הקניות שלך..." subMessage="✨ מכין הצעות AI" />
      ) : result ? (
        <ImportPreview
          result={result}
          candidates={candidates}
          categories={categories}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={setSelectedCandidateId}
          onUpdateCandidate={updateCandidate}
          onMergeIntoDuplicate={mergeIntoDuplicate}
          onCreateCategory={addCategory}
        />
      ) : null}
    </BottomSheet>
  );
}
