// TEMP DEBUG - not committed, will be deleted once the lists-loading
// failure is root-caused. Renders the "Database Error" panel with a
// button to copy the full structured debug report (ActiveListContext.
// tsx's buildDebugReportText output) to the clipboard as plain text.
//
// Deliberately NOT gated on import.meta.env.DEV: the only way to
// inspect this particular failure right now is a Vercel Preview build
// on an iPhone with no DevTools/Network tab access, and Preview builds
// run in production mode (DEV === false). Gating is instead purely on
// "did a lists fetch actually fail" (reportText is only ever set by
// ActiveListContext.tsx when debugSnapshot.error is populated) - this
// still never appears on a successful load.
import { useState } from 'react';

interface DebugReportPanelProps {
  reportText: string | null | undefined;
  fallbackMessage: string;
}

export default function DebugReportPanel({ reportText, fallbackMessage }: DebugReportPanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (!reportText) return null;

  // Parse the handful of fields back out of the report text for the
  // at-a-glance panel view - reportText itself (not this parsed
  // summary) is what actually gets copied, so nothing here can drift
  // out of sync with what the clipboard receives.
  const field = (label: string) => {
    const match = reportText.match(new RegExp(`^${label}: (.*)$`, 'm'));
    return match ? match[1] : null;
  };

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(reportText);
      setCopyState('copied');
    } catch {
      // No DevTools console to fall back to on an iPhone Preview build -
      // reveal a selectable <textarea> instead so the report can still
      // be copied by hand (tap the field, Select All, Copy).
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 3000);
  };

  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-mono text-red-800 whitespace-pre-wrap break-all">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-bold">Database Error</p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 rounded bg-red-600 text-white px-2 py-1 text-[11px] font-sans font-semibold hover:bg-red-700 transition-all"
        >
          {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed - select below' : 'Copy Debug Report'}
        </button>
      </div>
      <p>Status: {field('- HTTP Status') ?? '(none)'}</p>
      <p>Code: {field('- Code') ?? '(none)'}</p>
      <p>Message: {field('- Message') ?? fallbackMessage}</p>
      <p>Details: {field('- Details') ?? '(none)'}</p>
      <p>Hint: {field('- Hint') ?? '(none)'}</p>

      {copyState === 'failed' && (
        <textarea
          readOnly
          value={reportText}
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          className="mt-2 w-full h-40 rounded border border-red-300 bg-white p-2 text-[11px] font-mono text-gray-800"
        />
      )}
    </div>
  );
}
