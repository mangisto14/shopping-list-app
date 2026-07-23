// src/devtools/Storage/StorageSection.tsx
import { useMemo, useRef, useState } from 'react';
import { Section, ActionButton } from '../shared/controls';
import { swipeStore } from '../Swipe/store';

const SETTINGS_PREFIX = 'dev-settings:';

function readAllSettings(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(SETTINGS_PREFIX)) continue;
    try {
      out[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      out[key] = localStorage.getItem(key);
    }
  }
  return out;
}

export default function StorageSection({
  expanded, onToggle, visible,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean;
}) {
  const [tick, setTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const entries = useMemo(() => {
    const list: { key: string; value: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const raw = localStorage.getItem(key) ?? '';
      list.push({ key, value: raw.length > 60 ? `${raw.slice(0, 60)}…` : raw });
    }
    return list.sort((a, b) => a.key.localeCompare(b.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const handleClearStorage = () => {
    if (!window.confirm('Clear ALL localStorage for this app? This also signs you out.')) return;
    localStorage.clear();
    window.location.reload();
  };

  const handleResetPreferences = () => {
    if (!window.confirm('Reset app preferences (active list selection, collapsed category groups)? Keeps your session and dev settings.')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('shopping-list:'))
      .forEach((k) => localStorage.removeItem(k));
    setTick((t) => t + 1);
  };

  const handleExportSettings = () => {
    const payload = readAllSettings();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devtools-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      let count = 0;
      for (const [key, value] of Object.entries(parsed)) {
        if (!key.startsWith(SETTINGS_PREFIX)) continue; // never write arbitrary keys
        localStorage.setItem(key, JSON.stringify(value));
        count += 1;
      }
      setStatus(`Imported ${count} setting group(s). Reloading…`);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <Section title="Local Storage" expanded={expanded} onToggle={onToggle} visible={visible}>
      <div className="max-h-56 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-400">Empty.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.key} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-gray-500 truncate">{entry.key}</span>
              <span className="text-xs font-mono text-gray-800 truncate max-w-[50%] text-left" dir="ltr">{entry.value || '(empty)'}</span>
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        <ActionButton label="Reset Swipe Settings" onClick={() => { swipeStore.reset(); setTick((t) => t + 1); }} />
        <ActionButton label="Reset Preferences" onClick={handleResetPreferences} />
        <div className="flex gap-2">
          <div className="flex-1">
            <ActionButton label="Export Settings" onClick={handleExportSettings} />
          </div>
          <div className="flex-1">
            <ActionButton label="Import Settings" onClick={() => fileInputRef.current?.click()} />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportSettings(file);
            e.target.value = '';
          }}
        />
        <ActionButton label="Clear Local Storage" danger onClick={handleClearStorage} />
        {status && <p className="text-xs text-gray-500 pt-1">{status}</p>}
      </div>
    </Section>
  );
}
