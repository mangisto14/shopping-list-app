// src/devtools/shared/controls.tsx
// Reusable Material-style building blocks for every devtools section.
// Every interactive row takes a stable `id` (e.g. "swipe.revealThreshold")
// used for the favorites/pin feature and, in the console shell, for the
// search box's visibility filter.
import type { ReactNode } from 'react';
import { isFavorite, toggleFavorite, useFavoriteIds } from '../hooks/useFavorites';

export function Section({
  title, subtitle, expanded, onToggle, visible, children,
}: {
  title: string; subtitle?: string; expanded: boolean; onToggle: () => void; visible: boolean; children: ReactNode;
}) {
  if (!visible) return null;
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 text-left">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          className="flex-shrink-0 text-gray-400 transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {expanded && <div className="divide-y divide-gray-100">{children}</div>}
    </div>
  );
}

function FavoriteButton({ id }: { id: string }) {
  useFavoriteIds(); // subscribe so this button re-renders when the pin state changes
  const pinned = isFavorite(id);
  return (
    <button
      onClick={() => toggleFavorite(id)}
      aria-label={pinned ? 'Unpin from favorites' : 'Pin to favorites'}
      aria-pressed={pinned}
      className={`flex-shrink-0 text-base leading-none ${pinned ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400'}`}
    >
      {pinned ? '★' : '☆'}
    </button>
  );
}

function ResetFieldButton({ onReset }: { onReset?: () => void }) {
  if (!onReset) return null;
  return (
    <button onClick={onReset} className="flex-shrink-0 text-[11px] font-semibold text-gray-400 hover:text-gray-600">
      Reset
    </button>
  );
}

function RowHeader({ id, label, onReset }: { id: string; label: string; onReset?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <FavoriteButton id={id} />
      <label className="text-sm font-semibold text-gray-900 flex-1">{label}</label>
      <ResetFieldButton onReset={onReset} />
    </div>
  );
}

export function SliderRow({
  id, label, hint, unit, value, min, max, step, onChange, onReset,
}: {
  id: string; label: string; hint: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void; onReset?: () => void;
}) {
  return (
    <div className="px-4 py-3.5 space-y-2">
      <RowHeader id={id} label={label} onReset={onReset} />
      <p className="text-xs text-gray-500">{hint}</p>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          aria-label={`${label} slider`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <input
          type="number" min={min} max={max} step={step} value={value}
          aria-label={`${label} value`}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400 w-6 flex-shrink-0">{unit}</span>
      </div>
    </div>
  );
}

export function ToggleRow({
  id, label, hint, checked, onChange, onReset,
}: {
  id: string; label: string; hint: string; checked: boolean; onChange: (value: boolean) => void; onReset?: () => void;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FavoriteButton id={id} />
          <p className="text-sm font-semibold text-gray-900">{label}</p>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
      <ResetFieldButton onReset={onReset} />
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(-22px)' : 'translateX(-2px)', right: 0 }}
        />
      </button>
    </div>
  );
}

export function SelectRow<V extends string>({
  id, label, hint, value, options, onChange, onReset,
}: {
  id: string; label: string; hint: string; value: V; options: { value: V; label: string }[];
  onChange: (value: V) => void; onReset?: () => void;
}) {
  return (
    <div className="px-4 py-3.5 space-y-2">
      <RowHeader id={id} label={label} onReset={onReset} />
      <p className="text-xs text-gray-500">{hint}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              value === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xs font-mono text-gray-800 truncate max-w-[60%] text-left" dir="ltr">{value}</span>
    </div>
  );
}

export function ActionButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors ${
        danger ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
