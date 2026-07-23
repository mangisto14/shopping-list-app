// src/pages/DeveloperConsole.tsx
// Dev/QA-only. Gated by isDevSettingsEnabled() at three independent
// layers, so a broken gate at any one of them still isn't reachable in
// production: App.jsx only registers the /dev-settings route when the
// check passes, HeaderMenu2.tsx only shows the menu entry when it
// passes, and this component itself redirects away if it's ever
// reached another way.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useDeveloperConsole, isDevSettingsEnabled, type SwipeSettings, type AnimationSettings } from '../config/DeveloperConsoleContext';
import type { FeatureFlags } from '../config/featureFlags';
import { triggerForceSync } from '../config/forceSync';
import { useLastRealtimeEvent } from '../config/realtimeDebugStore';
import { getBuildInfo } from '../config/buildInfo';
import { useActiveList } from '../ActiveListContext';
import { useAuth } from '../hooks/useAuth';
import { useMembers } from '../hooks/useMembers';
import { supabase } from '../supabase/client';

export default function DeveloperConsole() {
  if (!isDevSettingsEnabled()) {
    return <Navigate to="/" replace />;
  }
  return <ConsolePanel />;
}

// ---------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------

function useSearch() {
  const [search, setSearch] = useState('');
  const matches = (label: string) => !search.trim() || label.toLowerCase().includes(search.trim().toLowerCase());
  return { search, setSearch, matches };
}

interface SectionProps {
  id: string;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  visible: boolean;
  children: React.ReactNode;
}

function Section({ title, subtitle, expanded, onToggle, visible, children }: SectionProps) {
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

function SliderRow({
  label, hint, unit, value, min, max, step, onChange,
}: {
  label: string; hint: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="px-4 py-3.5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-gray-900">{label}</label>
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
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
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xs font-mono text-gray-800 truncate max-w-[60%] text-left" dir="ltr">{value}</span>
    </div>
  );
}

function ActionButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
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

// ---------------------------------------------------------------------
// Performance metrics - scoped to this page only (see Performance
// section below): instrumenting the whole app to feed a render counter
// or FPS meter that's live everywhere would be exactly the kind of
// always-on production cost this feature is supposed to avoid. These
// hooks only ever run while the console itself is mounted.
// ---------------------------------------------------------------------

function useFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

const DEFAULT_CATEGORY_NAMES = ['מוצרי חלב', 'ירקות', 'פירות', 'מאפים', 'בשר ודגים', 'משקאות', 'קפואים', 'ניקיון', 'אחר'];
const DEMO_LIST_PREFIX = 'Demo List';

function ConsolePanel() {
  const developerConsole = useDeveloperConsole();
  const { swipe, animations, uiDebug, featureFlags, setSwipe, setAnimations, setUiDebug, setFeatureFlags, resetSwipe, resetAnimations, resetUiDebug, resetFeatureFlags, resetAll } = developerConsole;
  const { search, setSearch, matches } = useSearch();
  const location = useLocation();
  const fps = useFps();
  const renderCount = useRenderCount();
  const buildInfo = useMemo(() => getBuildInfo(), []);

  const { activeList, activeListId } = useActiveList();
  const { user } = useAuth();
  const { members } = useMembers();
  const lastEvent = useLastRealtimeEvent();
  const [connectionState, setConnectionState] = useState(() => supabase.realtime.connectionState());
  useEffect(() => {
    const id = window.setInterval(() => setConnectionState(supabase.realtime.connectionState()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    swipe: true, animations: false, uiDebug: false, realtime: false, flags: false,
    storage: false, db: false, env: false, perf: false,
  });
  const toggleSection = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const forceExpanded = search.trim().length > 0;

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [localStorageTick, setLocalStorageTick] = useState(0);

  const localStorageEntries = useMemo(() => {
    const entries: { key: string; value: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const raw = localStorage.getItem(key) ?? '';
      entries.push({ key, value: raw.length > 60 ? `${raw.slice(0, 60)}…` : raw });
    }
    return entries.sort((a, b) => a.key.localeCompare(b.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorageTick]);

  const handleCopyDebugInfo = async () => {
    const payload = {
      buildInfo,
      route: location.pathname,
      swipe, animations, uiDebug, featureFlags,
      activeListId, userId: user?.id ?? null,
      realtimeConnectionState: connectionState,
      lastRealtimeEvent: lastEvent,
      localStorageKeys: localStorageEntries.map((e) => e.key),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      setDbStatus('Clipboard write failed - copy manually from the console instead.');
      // eslint-disable-next-line no-console
      console.log('[DeveloperConsole] debug info', payload);
    }
  };

  const handleClearLocalStorage = () => {
    if (!window.confirm('Clear ALL localStorage for this app? This also signs you out.')) return;
    localStorage.clear();
    window.location.reload();
  };

  const handleResetPreferences = () => {
    if (!window.confirm('Reset app preferences (active list selection, collapsed category groups)? Keeps your session and dev settings.')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('shopping-list:'))
      .forEach((k) => localStorage.removeItem(k));
    setLocalStorageTick((t) => t + 1);
  };

  const runDbAction = async (confirmMessage: string | null, action: () => Promise<string>) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setDbStatus('Running…');
    try {
      setDbStatus(await action());
    } catch (err) {
      setDbStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const seedDefaultCategories = async () => {
    if (!activeListId || !user) return 'No active list.';
    const { data: existing } = await supabase.from('categories').select('name').eq('list_id', activeListId);
    const existingNames = new Set((existing ?? []).map((c) => c.name));
    const missing = DEFAULT_CATEGORY_NAMES.filter((n) => !existingNames.has(n));
    if (missing.length === 0) return 'Already has every default category.';
    const { error } = await supabase.from('categories').insert(missing.map((name) => ({ list_id: activeListId, user_id: user.id, name })));
    if (error) throw error;
    return `Added ${missing.length} categor${missing.length === 1 ? 'y' : 'ies'}.`;
  };

  const createDemoShoppingList = async () => {
    if (!user) return 'Not signed in.';
    const name = `${DEMO_LIST_PREFIX} ${new Date().toLocaleString()}`;
    const { data: list, error } = await supabase.from('lists').insert({ name, owner_id: user.id }).select().single();
    if (error || !list) throw error ?? new Error('insert returned no row');
    const { error: memberError } = await supabase.from('list_members').insert({ list_id: list.id, user_id: user.id });
    if (memberError) throw memberError;
    return `Created "${name}".`;
  };

  const archiveDemoLists = async () => {
    if (!user) return 'Not signed in.';
    const { data, error } = await supabase.from('lists').update({ archived: true }).eq('owner_id', user.id).ilike('name', `${DEMO_LIST_PREFIX}%`).select('id');
    if (error) throw error;
    return `Archived ${data?.length ?? 0} demo list(s).`;
  };

  const resetDemoData = async () => {
    if (!user) return 'Not signed in.';
    const { data, error } = await supabase.from('lists').delete().eq('owner_id', user.id).ilike('name', `${DEMO_LIST_PREFIX}%`).select('id');
    if (error) throw error;
    return `Deleted ${data?.length ?? 0} demo list(s) (and their items/categories via cascade).`;
  };

  const searchVisible = (labels: string[]) => labels.some(matches);

  return (
    <div dir="ltr" className="max-w-md sm:max-w-lg mx-auto px-4 pt-6 pb-28 space-y-4 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Developer Console</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dev/QA only - never shown to end users. Changes apply live and persist in this browser's localStorage.
        </p>
      </div>

      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur -mx-4 px-4 py-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings…"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <ActionButton label="Reset All" onClick={() => window.confirm('Reset every Developer Console setting to its default?') && resetAll()} />
        </div>
        <div className="flex-1">
          <ActionButton label={copyStatus === 'copied' ? 'Copied ✓' : 'Copy Debug Info'} onClick={handleCopyDebugInfo} />
        </div>
      </div>

      {/* 1. Swipe Delete */}
      <Section
        id="swipe" title="Swipe Delete" expanded={forceExpanded || expanded.swipe} onToggle={() => toggleSection('swipe')}
        visible={searchVisible(['revealThreshold', 'revealDuration', 'autoCloseDelay', 'animationDuration', 'swipe delete'])}
      >
        {matches('revealThreshold') && (
          <SliderRow label="revealThreshold" unit="px" hint="Drag distance at which a released row snaps open to reveal the delete action." value={swipe.revealThreshold} min={20} max={200} step={5} onChange={(v) => setSwipe({ revealThreshold: v } as Partial<SwipeSettings>)} />
        )}
        {matches('revealDuration') && (
          <SliderRow label="revealDuration" unit="ms" hint="Transition duration for the row sliding open/closed." value={swipe.revealDuration} min={0} max={1000} step={10} onChange={(v) => setSwipe({ revealDuration: v } as Partial<SwipeSettings>)} />
        )}
        {matches('autoCloseDelay') && (
          <SliderRow label="autoCloseDelay" unit="ms" hint="How long an open (revealed, undeleted) row waits before closing itself. 0 disables auto-close." value={swipe.autoCloseDelay} min={0} max={5000} step={100} onChange={(v) => setSwipe({ autoCloseDelay: v } as Partial<SwipeSettings>)} />
        )}
        {matches('animationDuration') && (
          <SliderRow label="animationDuration" unit="ms" hint="Duration of the delete slide/fade/collapse choreography." value={swipe.animationDuration} min={0} max={1000} step={10} onChange={(v) => setSwipe({ animationDuration: v } as Partial<SwipeSettings>)} />
        )}
        <div className="px-4 py-3">
          <ActionButton label="Restore Defaults" onClick={resetSwipe} />
        </div>
      </Section>

      {/* 2. Animations */}
      <Section
        id="animations" title="Animations" expanded={forceExpanded || expanded.animations} onToggle={() => toggleSection('animations')}
        visible={searchVisible(['bottom sheet', 'snackbar', 'fab', 'list item animation', 'animations'])}
      >
        {matches('bottom sheet') && (
          <SliderRow label="Bottom Sheet Animation" unit="ms" hint="BottomSheet open/close slide + backdrop fade duration." value={animations.bottomSheetDuration} min={0} max={1000} step={10} onChange={(v) => setAnimations({ bottomSheetDuration: v } as Partial<AnimationSettings>)} />
        )}
        {matches('snackbar') && (
          <SliderRow label="Snackbar Duration" unit="ms" hint="How long the post-delete Undo snackbar stays up before the deletion commits." value={animations.snackbarDuration} min={500} max={15000} step={250} onChange={(v) => setAnimations({ snackbarDuration: v } as Partial<AnimationSettings>)} />
        )}
        {matches('fab') && (
          <SliderRow label="FAB Animation Duration" unit="ms" hint="Floating add-button tap pulse/ping duration." value={animations.fabAnimationDuration} min={0} max={2000} step={50} onChange={(v) => setAnimations({ fabAnimationDuration: v } as Partial<AnimationSettings>)} />
        )}
        {matches('list item animation') && (
          <SliderRow label="List Item Animation Duration" unit="ms" hint="Category group expand/collapse transition duration." value={animations.listItemAnimationDuration} min={0} max={1000} step={10} onChange={(v) => setAnimations({ listItemAnimationDuration: v } as Partial<AnimationSettings>)} />
        )}
        <div className="px-4 py-3">
          <ActionButton label="Restore Defaults" onClick={resetAnimations} />
        </div>
      </Section>

      {/* 3. UI Debug */}
      <Section
        id="uiDebug" title="UI Debug" expanded={forceExpanded || expanded.uiDebug} onToggle={() => toggleSection('uiDebug')}
        visible={searchVisible(['component borders', 'safe area', 'touch areas', 'highlight re-renders', 'layout grid'])}
      >
        {matches('component borders') && (
          <ToggleRow label="Show Component Borders" hint="Outlines every element on the page." checked={uiDebug.showComponentBorders} onChange={(v) => setUiDebug({ showComponentBorders: v })} />
        )}
        {matches('safe area') && (
          <ToggleRow label="Show Safe Area Insets" hint="Highlights env(safe-area-inset-*) regions along each edge." checked={uiDebug.showSafeAreaInsets} onChange={(v) => setUiDebug({ showSafeAreaInsets: v })} />
        )}
        {matches('touch areas') && (
          <ToggleRow label="Show Touch Areas" hint="Outlines every button/link/input's actual tappable area." checked={uiDebug.showTouchAreas} onChange={(v) => setUiDebug({ showTouchAreas: v })} />
        )}
        {matches('highlight re-renders') && (
          <ToggleRow label="Highlight Re-renders" hint="Briefly flashes elements whose DOM content/attributes just changed." checked={uiDebug.highlightRerenders} onChange={(v) => setUiDebug({ highlightRerenders: v })} />
        )}
        {matches('layout grid') && (
          <ToggleRow label="Show Layout Grid" hint="Overlays an 8px baseline grid." checked={uiDebug.showLayoutGrid} onChange={(v) => setUiDebug({ showLayoutGrid: v })} />
        )}
        <div className="px-4 py-3">
          <ActionButton label="Restore Defaults" onClick={resetUiDebug} />
        </div>
      </Section>

      {/* 4. Realtime Debug */}
      <Section
        id="realtime" title="Realtime Debug" expanded={forceExpanded || expanded.realtime} onToggle={() => toggleSection('realtime')}
        visible={searchVisible(['realtime', 'active list', 'user id', 'list id', 'connection status', 'connected members'])}
      >
        <InfoRow label="Current Active List" value={activeList?.name ?? '—'} />
        <InfoRow label="Current User ID" value={user?.id ?? '—'} />
        <InfoRow label="Current List ID" value={activeListId ?? '—'} />
        <InfoRow label="Realtime Connection Status" value={connectionState} />
        <InfoRow label="Last Realtime Event" value={lastEvent ? `${lastEvent.table} ${lastEvent.event} @ ${new Date(lastEvent.at).toLocaleTimeString()}` : 'none yet'} />
        <InfoRow label="Connected Members" value={`${members.length} (list members, not live presence)`} />
        <div className="px-4 py-3 flex gap-2">
          <div className="flex-1">
            <ActionButton
              label="Reconnect Realtime"
              onClick={() => {
                supabase.realtime.disconnect();
                supabase.realtime.connect();
              }}
            />
          </div>
          <div className="flex-1">
            <ActionButton label="Force Sync" onClick={triggerForceSync} />
          </div>
        </div>
      </Section>

      {/* 5. Feature Flags */}
      <Section
        id="flags" title="Feature Flags" expanded={forceExpanded || expanded.flags} onToggle={() => toggleSection('flags')}
        visible={searchVisible(['undo snackbar', 'haptics', 'email invite', 'swipe delete', 'demo animation', 'experimental'])}
      >
        {matches('undo snackbar') && (
          <ToggleRow label="Enable Undo Snackbar" hint="When off, swipe-delete removes items immediately (no undo window)." checked={featureFlags.enableUndoSnackbar} onChange={(v) => setFeatureFlags({ enableUndoSnackbar: v } as Partial<FeatureFlags>)} />
        )}
        {matches('haptics') && (
          <ToggleRow label="Enable Haptics" hint="Vibration feedback when a swipe crosses the delete threshold." checked={featureFlags.enableHaptics} onChange={(v) => setFeatureFlags({ enableHaptics: v } as Partial<FeatureFlags>)} />
        )}
        {matches('email invite') && (
          <ToggleRow label="Enable Email Invite" hint="When off, the invite modal only offers the share link." checked={featureFlags.enableEmailInvite} onChange={(v) => setFeatureFlags({ enableEmailInvite: v } as Partial<FeatureFlags>)} />
        )}
        {matches('swipe delete') && (
          <ToggleRow label="Enable Swipe Delete" hint="When off, item rows use a plain delete button instead of swipe." checked={featureFlags.enableSwipeDelete} onChange={(v) => setFeatureFlags({ enableSwipeDelete: v } as Partial<FeatureFlags>)} />
        )}
        {matches('demo animation') && (
          <ToggleRow label="Enable Demo Animation" hint="One-time swipe-discovery hint row shown on an empty list." checked={featureFlags.enableDemoAnimation} onChange={(v) => setFeatureFlags({ enableDemoAnimation: v } as Partial<FeatureFlags>)} />
        )}
        {matches('experimental') && (
          <ToggleRow label="Enable Experimental Features" hint="Reserved - no feature is gated on this yet." checked={featureFlags.enableExperimentalFeatures} onChange={(v) => setFeatureFlags({ enableExperimentalFeatures: v } as Partial<FeatureFlags>)} />
        )}
        <div className="px-4 py-3">
          <ActionButton label="Restore Defaults" onClick={resetFeatureFlags} />
        </div>
      </Section>

      {/* 6. Local Storage */}
      <Section
        id="storage" title="Local Storage" expanded={forceExpanded || expanded.storage} onToggle={() => toggleSection('storage')}
        visible={searchVisible(['local storage', 'clear local storage', 'reset preferences', 'reset swipe settings'])}
      >
        <div className="max-h-56 overflow-y-auto">
          {localStorageEntries.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Empty.</p>
          ) : (
            localStorageEntries.map((entry) => <InfoRow key={entry.key} label={entry.key} value={entry.value || '(empty)'} />)
          )}
        </div>
        <div className="px-4 py-3 space-y-2">
          <ActionButton label="Reset Swipe Settings" onClick={() => { resetSwipe(); setLocalStorageTick((t) => t + 1); }} />
          <ActionButton label="Reset Preferences" onClick={handleResetPreferences} />
          <ActionButton label="Clear Local Storage" danger onClick={handleClearLocalStorage} />
        </div>
      </Section>

      {/* 7. Database Utilities - development only, stricter than the
          console's own gate: never reachable even in a production
          build with VITE_ENABLE_DEV_SETTINGS=true, since that flag
          could plausibly be set on a deployed preview environment
          pointed at a real database. */}
      {import.meta.env.DEV && (
        <Section
          id="db" title="Database Utilities" subtitle="Development only" expanded={forceExpanded || expanded.db} onToggle={() => toggleSection('db')}
          visible={searchVisible(['seed default categories', 'create demo shopping list', 'archive demo lists', 'reset demo data', 'database'])}
        >
          <div className="px-4 py-3 space-y-2">
            <ActionButton label="Seed Default Categories" onClick={() => runDbAction(null, seedDefaultCategories)} />
            <ActionButton label="Create Demo Shopping List" onClick={() => runDbAction(null, createDemoShoppingList)} />
            <ActionButton label="Archive Demo Lists" onClick={() => runDbAction('Archive every list named "Demo List…"?', archiveDemoLists)} />
            <ActionButton label="Reset Demo Data" danger onClick={() => runDbAction('Permanently delete every list named "Demo List…" (and its items/categories)? This cannot be undone.', resetDemoData)} />
            {dbStatus && <p className="text-xs text-gray-500 pt-1">{dbStatus}</p>}
          </div>
        </Section>
      )}

      {/* 8. Environment */}
      <Section
        id="env" title="Environment" expanded={forceExpanded || expanded.env} onToggle={() => toggleSection('env')}
        visible={searchVisible(['environment', 'git branch', 'build version', 'build date', 'supabase url', 'api mode'])}
      >
        <InfoRow label="Environment" value={buildInfo.environment} />
        <InfoRow label="Git Branch" value={buildInfo.gitBranch} />
        <InfoRow label="Build Version" value={buildInfo.buildVersion} />
        <InfoRow label="Build Date" value={new Date(buildInfo.buildDate).toLocaleString()} />
        <InfoRow label="VITE_SUPABASE_URL" value={buildInfo.supabaseUrl || '—'} />
        <InfoRow label="Current API Mode" value={buildInfo.apiMode} />
      </Section>

      {/* 9. Performance */}
      <Section
        id="perf" title="Performance" expanded={forceExpanded || expanded.perf} onToggle={() => toggleSection('perf')}
        visible={searchVisible(['render count', 'fps', 'memory usage', 'current route'])}
      >
        <InfoRow label="Render Count (this page)" value={String(renderCount)} />
        <InfoRow label="FPS" value={fps > 0 ? String(fps) : 'measuring…'} />
        <InfoRow
          label="Memory Usage"
          value={
            'memory' in performance
              ? `${Math.round(((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize) / 1048576)} MB`
              : 'not available in this browser'
          }
        />
        <InfoRow label="Current Route" value={location.pathname} />
      </Section>
    </div>
  );
}
