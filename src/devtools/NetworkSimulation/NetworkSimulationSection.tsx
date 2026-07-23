// src/devtools/NetworkSimulation/NetworkSimulationSection.tsx
import { Section, SelectRow, ToggleRow } from '../shared/controls';
import { networkSimulationStore, type NetworkMode } from './store';

export default function NetworkSimulationSection({
  expanded, onToggle, visible, matches,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean; matches: (label: string, id?: string) => boolean;
}) {
  const network = networkSimulationStore.useValue();

  return (
    <Section
      title="Network Simulation"
      subtitle="Development/testing only"
      expanded={expanded}
      onToggle={onToggle}
      visible={visible}
    >
      {matches('Network Mode', 'network.mode') && (
        <SelectRow<NetworkMode>
          id="network.mode"
          label="Network Mode"
          hint="Affects every request in the app, like a browser's own network throttling. Offline rejects requests outright; Slow 3G/WiFi add a delay before letting them through."
          value={network.mode}
          options={[
            { value: 'none', label: 'Normal' },
            { value: 'offline', label: 'Offline' },
            { value: 'slow-3g', label: 'Slow 3G' },
            { value: 'slow-wifi', label: 'Slow WiFi' },
          ]}
          onChange={(v) => networkSimulationStore.set({ mode: v })}
          onReset={() => networkSimulationStore.resetField('mode')}
        />
      )}
      {matches('Disable Realtime', 'network.disableRealtime') && (
        <ToggleRow
          id="network.disableRealtime"
          label="Disable Realtime"
          hint="Drops the Supabase Realtime connection so you can see how the app behaves without live updates."
          checked={network.disableRealtime}
          onChange={(v) => networkSimulationStore.set({ disableRealtime: v })}
          onReset={() => networkSimulationStore.resetField('disableRealtime')}
        />
      )}
      <div className="px-4 py-3">
        <button
          onClick={() => networkSimulationStore.reset()}
          className="w-full text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Restore Defaults
        </button>
      </div>
    </Section>
  );
}
