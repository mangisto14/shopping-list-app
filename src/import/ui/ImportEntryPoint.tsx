// src/import/ui/ImportEntryPoint.tsx
// The Smart Import entry point, rendered from the Lists screen (per
// approved design change #1 - not HeaderMenu2). Gated on the existing
// devtools feature flag `enableExperimentalFeatures` (previously
// unused - this is its first real consumer): renders nothing when the
// flag is off, so Phase 1 ships fully wired but invisible by default.
import { useState } from 'react';
import { useDevTools } from '../../devtools';
import ImportSheet from './ImportSheet';

export default function ImportEntryPoint() {
  const { featureFlags } = useDevTools();
  const [open, setOpen] = useState(false);

  if (!featureFlags.enableExperimentalFeatures) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all active:scale-[0.99]"
      >
        <span aria-hidden="true">✨</span>
        ייבוא חכם
      </button>

      <ImportSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
