// src/devtools/DeveloperConsole/ConsolePanel.tsx
// Orchestrates every domain section. This file (and DeveloperConsolePage.tsx)
// is the only place in the module that needs to know all the domains
// exist together - each domain folder otherwise stands alone.
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useConsoleFilter } from '../hooks/useConsoleFilter';
import { useDevTools } from '../hooks/useDevTools';
import { uiDebugStore } from '../DebugOverlay/store';
import { appearanceStore } from '../Appearance/store';
import { networkSimulationStore } from '../NetworkSimulation/store';
import { useLastRealtimeEvent } from '../Realtime/eventStore';
import { getBuildInfo } from '../Environment/buildInfo';
import { useActiveList } from '../../ActiveListContext';
import { useAuth } from '../../hooks/useAuth';

import SwipeSection from '../Swipe/SwipeSection';
import AnimationsSection from '../Animations/AnimationsSection';
import FeatureFlagsSection from '../FeatureFlags/FeatureFlagsSection';
import RealtimeSection from '../Realtime/RealtimeSection';
import EnvironmentSection from '../Environment/EnvironmentSection';
import StorageSection from '../Storage/StorageSection';
import UiDebugSection from '../DebugOverlay/UiDebugSection';
import AppearanceSection from '../Appearance/AppearanceSection';
import NetworkSimulationSection from '../NetworkSimulation/NetworkSimulationSection';
import MockDataSection from '../MockData/MockDataSection';

const SECTION_IDS = ['swipe', 'animations', 'flags', 'appearance', 'network', 'debug', 'realtime', 'storage', 'mockData', 'env'] as const;

export default function ConsolePanel() {
  const { resetAll, swipe, animations, featureFlags } = useDevTools();
  const { search, setSearch, favoritesOnly, setFavoritesOnly, matches, anyMatch, forceExpanded } = useConsoleFilter();
  const location = useLocation();
  const { activeListId } = useActiveList();
  const { user } = useAuth();
  const lastEvent = useLastRealtimeEvent();
  const buildInfo = useMemo(() => getBuildInfo(), []);

  const [expanded, setExpanded] = useState<Record<(typeof SECTION_IDS)[number], boolean>>({
    swipe: true, animations: false, flags: false, appearance: false, network: false,
    debug: false, realtime: false, storage: false, mockData: false, env: false,
  });
  const toggleSection = (id: (typeof SECTION_IDS)[number]) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopyDebugReport = async () => {
    const report = {
      buildInfo,
      route: location.pathname,
      userId: user?.id ?? null,
      activeListId,
      lastRealtimeEvent: lastEvent,
      swipe, animations, featureFlags,
      uiDebug: uiDebugStore.get(),
      appearance: appearanceStore.get(),
      network: networkSimulationStore.get(),
    };
    const text = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      // eslint-disable-next-line no-console
      console.log('[DeveloperConsole] debug report', report);
    }
  };

  return (
    <div dir="ltr" className="max-w-md sm:max-w-lg mx-auto px-4 pt-6 pb-28 space-y-4 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Developer Console</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dev/QA only - never shown to end users. Changes apply live and persist in this browser's localStorage.
        </p>
      </div>

      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur -mx-4 px-4 py-2 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings…"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            favoritesOnly ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          {favoritesOnly ? '★ Favorites only' : '☆ Favorites only'}
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <button
            onClick={() => window.confirm('Reset every Developer Console setting to its default?') && resetAll()}
            className="w-full text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Reset All
          </button>
        </div>
        <div className="flex-1">
          <button
            onClick={handleCopyDebugReport}
            className="w-full text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {copyStatus === 'copied' ? 'Copied ✓' : 'Copy Debug Report'}
          </button>
        </div>
      </div>

      <SwipeSection
        expanded={forceExpanded || expanded.swipe} onToggle={() => toggleSection('swipe')} matches={matches}
        visible={anyMatch([
          { label: 'Reveal Threshold', id: 'swipe.revealThreshold' },
          { label: 'Reveal Duration', id: 'swipe.revealDuration' },
          { label: 'Auto Close Delay', id: 'swipe.autoCloseDelay' },
          { label: 'Animation Duration', id: 'swipe.animationDuration' },
        ])}
      />

      <AnimationsSection
        expanded={forceExpanded || expanded.animations} onToggle={() => toggleSection('animations')} matches={matches}
        visible={anyMatch([
          { label: 'Bottom Sheet', id: 'animations.bottomSheetDuration' },
          { label: 'FAB', id: 'animations.fabAnimationDuration' },
          { label: 'Snackbar', id: 'animations.snackbarDuration' },
          { label: 'List Item Animation', id: 'animations.listItemAnimationDuration' },
          { label: 'Page Transition', id: 'animations.pageTransitionDuration' },
        ])}
      />

      <FeatureFlagsSection
        expanded={forceExpanded || expanded.flags} onToggle={() => toggleSection('flags')} matches={matches}
        visible={anyMatch([
          { label: 'Email Invite', id: 'flags.enableEmailInvite' },
          { label: 'Undo Snackbar', id: 'flags.enableUndoSnackbar' },
          { label: 'Swipe Delete', id: 'flags.enableSwipeDelete' },
          { label: 'Demo Mode', id: 'flags.enableDemoMode' },
          { label: 'Haptics', id: 'flags.enableHaptics' },
          { label: 'Experimental Features', id: 'flags.enableExperimentalFeatures' },
        ])}
      />

      <AppearanceSection
        expanded={forceExpanded || expanded.appearance} onToggle={() => toggleSection('appearance')} matches={matches}
        visible={anyMatch([
          { label: 'Language', id: 'appearance.language' },
          { label: 'Direction', id: 'appearance.direction' },
          { label: 'Theme', id: 'appearance.theme' },
        ])}
      />

      <NetworkSimulationSection
        expanded={forceExpanded || expanded.network} onToggle={() => toggleSection('network')} matches={matches}
        visible={anyMatch([
          { label: 'Network Mode', id: 'network.mode' },
          { label: 'Disable Realtime', id: 'network.disableRealtime' },
        ])}
      />

      <UiDebugSection
        expanded={forceExpanded || expanded.debug} onToggle={() => toggleSection('debug')} matches={matches}
        visible={anyMatch([
          { label: 'Show Component Borders', id: 'debug.showComponentBorders' },
          { label: 'Show Safe Area Insets', id: 'debug.showSafeAreaInsets' },
          { label: 'Show Touch Areas', id: 'debug.showTouchAreas' },
          { label: 'Highlight Re-renders', id: 'debug.highlightRerenders' },
          { label: 'Show Layout Grid', id: 'debug.showLayoutGrid' },
        ])}
      />

      <RealtimeSection
        expanded={forceExpanded || expanded.realtime} onToggle={() => toggleSection('realtime')}
        visible={anyMatch([
          { label: 'Realtime Debug' }, { label: 'Connection Status' }, { label: 'Current User' }, { label: 'Current List' },
          { label: 'Connected Members' }, { label: 'Last Realtime Event' }, { label: 'Reconnect' }, { label: 'Force Sync' },
        ])}
      />

      <StorageSection
        expanded={forceExpanded || expanded.storage} onToggle={() => toggleSection('storage')}
        visible={anyMatch([{ label: 'Local Storage' }, { label: 'Export Settings' }, { label: 'Import Settings' }])}
      />

      <MockDataSection
        expanded={forceExpanded || expanded.mockData} onToggle={() => toggleSection('mockData')}
        visible={anyMatch([{ label: 'Mock Data' }, { label: 'Demo Shopping List' }, { label: 'Demo Categories' }, { label: 'Demo Family' }])}
      />

      <EnvironmentSection
        expanded={forceExpanded || expanded.env} onToggle={() => toggleSection('env')}
        visible={anyMatch([{ label: 'Environment' }])}
      />
    </div>
  );
}
