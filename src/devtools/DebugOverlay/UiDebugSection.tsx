// src/devtools/DebugOverlay/UiDebugSection.tsx
import { Section, ToggleRow, ActionButton } from '../shared/controls';
import { uiDebugStore } from './store';

export default function UiDebugSection({
  expanded, onToggle, visible, matches,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean; matches: (label: string, id?: string) => boolean;
}) {
  const uiDebug = uiDebugStore.useValue();

  return (
    <Section title="UI Debug" expanded={expanded} onToggle={onToggle} visible={visible}>
      {matches('Show Component Borders', 'debug.showComponentBorders') && (
        <ToggleRow
          id="debug.showComponentBorders" label="Show Component Borders" hint="Outlines every element on the page."
          checked={uiDebug.showComponentBorders}
          onChange={(v) => uiDebugStore.set({ showComponentBorders: v })}
          onReset={() => uiDebugStore.resetField('showComponentBorders')}
        />
      )}
      {matches('Show Safe Area Insets', 'debug.showSafeAreaInsets') && (
        <ToggleRow
          id="debug.showSafeAreaInsets" label="Show Safe Area Insets" hint="Highlights env(safe-area-inset-*) regions along each edge."
          checked={uiDebug.showSafeAreaInsets}
          onChange={(v) => uiDebugStore.set({ showSafeAreaInsets: v })}
          onReset={() => uiDebugStore.resetField('showSafeAreaInsets')}
        />
      )}
      {matches('Show Touch Areas', 'debug.showTouchAreas') && (
        <ToggleRow
          id="debug.showTouchAreas" label="Show Touch Areas" hint="Outlines every button/link/input's actual tappable area."
          checked={uiDebug.showTouchAreas}
          onChange={(v) => uiDebugStore.set({ showTouchAreas: v })}
          onReset={() => uiDebugStore.resetField('showTouchAreas')}
        />
      )}
      {matches('Highlight Re-renders', 'debug.highlightRerenders') && (
        <ToggleRow
          id="debug.highlightRerenders" label="Highlight Re-renders" hint="Briefly flashes elements whose DOM content/attributes just changed."
          checked={uiDebug.highlightRerenders}
          onChange={(v) => uiDebugStore.set({ highlightRerenders: v })}
          onReset={() => uiDebugStore.resetField('highlightRerenders')}
        />
      )}
      {matches('Show Layout Grid', 'debug.showLayoutGrid') && (
        <ToggleRow
          id="debug.showLayoutGrid" label="Show Layout Grid" hint="Overlays an 8px baseline grid."
          checked={uiDebug.showLayoutGrid}
          onChange={(v) => uiDebugStore.set({ showLayoutGrid: v })}
          onReset={() => uiDebugStore.resetField('showLayoutGrid')}
        />
      )}
      <div className="px-4 py-3">
        <ActionButton label="Restore Defaults" onClick={() => uiDebugStore.reset()} />
      </div>
    </Section>
  );
}
