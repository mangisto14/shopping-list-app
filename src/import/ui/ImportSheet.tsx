// src/import/ui/ImportSheet.tsx
// The Smart Import flow's shell. Lists every registered source (all 8,
// per the approved design - unavailable ones show "Coming Soon" and
// are non-interactive, never hidden), then walks through
// pick source -> provide input -> preview -> commit.
//
// This component only ever imports from '../index' (the module's
// public barrel) and '../types' - never a concrete source/extractor/
// normalizer file. It doesn't know or care which one ran.
import { useEffect, useState } from 'react';
import BottomSheet from '../../components/ui/BottomSheet';
import { useCategories } from '../../hooks/useCategories';
import { useItems } from '../../hooks/useItems';
import { importService } from '../index';
import type { ImportItemCandidate, ImportSourceId, ValidatedImportResult } from '../index';
import ImportPreview from './ImportPreview';
import ImportLoadingState from './ImportLoadingState';

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'source' | 'analyzing' | 'preview';

export default function ImportSheet({ open, onClose }: ImportSheetProps) {
  const { categories } = useCategories();
  const { items, addItem } = useItems();

  const [step, setStep] = useState<Step>('source');
  const [sources, setSources] = useState<{ id: ImportSourceId; label: string; icon: string; available: boolean }[]>(
    []
  );
  const [pasteText, setPasteText] = useState('');
  const [result, setResult] = useState<ValidatedImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setStep('source');
      setPasteText('');
      setResult(null);
      setError('');
      return;
    }
    importService.listSources().then((list) => {
      setSources(
        list.map(({ meta, available }) => ({ id: meta.id, label: meta.labelHe, icon: meta.icon, available }))
      );
    });
  }, [open]);

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
      const validated = await importService.runImport(
        'paste-text',
        {
          existingCategories: categories.map((c) => ({ id: c.id, name: c.name })),
          existingItemNames: items.map((i) => i.name),
        },
        { kind: 'text', text: pasteText }
      );
      setResult(validated);
      setStep('preview');
    } catch (err) {
      console.error('Smart Import: analyze failed', err);
      setError('לא ניתן היה לנתח את הטקסט. נסה/י שוב.');
      setStep('source');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (candidates: ImportItemCandidate[]) => {
    if (!result) return;
    setSubmitting(true);
    try {
      await importService.commit({ ...result, candidates }, addItem);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ייבוא חכם">
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
          categories={categories}
          onConfirm={handleConfirm}
          onCancel={() => setStep('source')}
          submitting={submitting}
        />
      ) : null}
    </BottomSheet>
  );
}
