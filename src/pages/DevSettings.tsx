// src/pages/DevSettings.tsx
// Dev/QA-only screen for tuning interaction timing without a rebuild.
// Gated by isDevSettingsEnabled() both here and at the route/menu level
// (App.tsx, HeaderMenu2.tsx) - this page is never reachable in an
// ordinary production build.
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  DEFAULT_SWIPE_SETTINGS,
  isDevSettingsEnabled,
  resetSwipeSettings,
  setSwipeSettings,
  useSwipeSettings,
  type SwipeSettings,
} from '../config/devSettings';

interface FieldSpec {
  key: keyof SwipeSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const FIELDS: FieldSpec[] = [
  {
    key: 'revealThreshold',
    label: 'revealThreshold',
    hint: 'Drag distance at which a released row snaps open to reveal the delete action.',
    min: 20,
    max: 200,
    step: 5,
    unit: 'px',
  },
  {
    key: 'revealDuration',
    label: 'revealDuration',
    hint: 'Transition duration for the row sliding open/closed.',
    min: 0,
    max: 1000,
    step: 10,
    unit: 'ms',
  },
  {
    key: 'autoCloseDelay',
    label: 'autoCloseDelay',
    hint: 'How long an open (revealed, undeleted) row waits before closing itself. 0 disables auto-close.',
    min: 0,
    max: 5000,
    step: 100,
    unit: 'ms',
  },
  {
    key: 'animationDuration',
    label: 'animationDuration',
    hint: 'Duration of the delete slide/fade/collapse choreography.',
    min: 0,
    max: 1000,
    step: 10,
    unit: 'ms',
  },
];

export default function DevSettings() {
  // Defense in depth: App.tsx only registers this route when the gate
  // passes, but guard the component itself too in case it's ever
  // reached another way.
  if (!isDevSettingsEnabled()) {
    return <Navigate to="/" replace />;
  }

  return <DevSettingsPanel />;
}

function DevSettingsPanel() {
  const settings = useSwipeSettings();
  const [justSaved, setJustSaved] = useState<keyof SwipeSettings | null>(null);

  const handleChange = (key: keyof SwipeSettings, value: number) => {
    if (Number.isNaN(value)) return;
    setSwipeSettings({ [key]: value });
    setJustSaved(key);
    window.setTimeout(() => setJustSaved((current) => (current === key ? null : current)), 800);
  };

  return (
    <div dir="ltr" className="max-w-md sm:max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Developer Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dev/QA only - tunes live interaction timing without rebuilding the app. Changes persist in this browser's
          localStorage.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] divide-y divide-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">Swipe Delete</h2>
        </div>

        {FIELDS.map((field) => (
          <div key={field.key} className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={field.key} className="text-sm font-semibold text-gray-900">
                {field.label}
              </label>
              <span className="text-xs text-gray-400">
                {justSaved === field.key ? 'saved ✓' : `${field.unit}`}
              </span>
            </div>
            <p className="text-xs text-gray-500">{field.hint}</p>
            <div className="flex items-center gap-3">
              <input
                id={field.key}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.key]}
                onChange={(e) => handleChange(field.key, Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.key]}
                onChange={(e) => handleChange(field.key, Number(e.target.value))}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => resetSwipeSettings()}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Reset to defaults
      </button>

      <p className="text-xs text-gray-400">
        Defaults: revealThreshold {DEFAULT_SWIPE_SETTINGS.revealThreshold}px, revealDuration{' '}
        {DEFAULT_SWIPE_SETTINGS.revealDuration}ms, autoCloseDelay {DEFAULT_SWIPE_SETTINGS.autoCloseDelay}ms,
        animationDuration {DEFAULT_SWIPE_SETTINGS.animationDuration}ms.
      </p>
    </div>
  );
}
