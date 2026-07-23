// src/devtools/FeatureFlags/FeatureFlagsSection.tsx
import { Section, ToggleRow, ActionButton } from '../shared/controls';
import { featureFlagsStore } from './store';

export default function FeatureFlagsSection({
  expanded, onToggle, visible, matches,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean; matches: (label: string, id?: string) => boolean;
}) {
  const flags = featureFlagsStore.useValue();

  return (
    <Section title="Feature Flags" expanded={expanded} onToggle={onToggle} visible={visible}>
      {matches('Email Invite', 'flags.enableEmailInvite') && (
        <ToggleRow
          id="flags.enableEmailInvite" label="Email Invite"
          hint="When off, the invite modal only offers the share link."
          checked={flags.enableEmailInvite}
          onChange={(v) => featureFlagsStore.set({ enableEmailInvite: v })}
          onReset={() => featureFlagsStore.resetField('enableEmailInvite')}
        />
      )}
      {matches('Undo Snackbar', 'flags.enableUndoSnackbar') && (
        <ToggleRow
          id="flags.enableUndoSnackbar" label="Undo Snackbar"
          hint="When off, swipe-delete removes items immediately (no undo window)."
          checked={flags.enableUndoSnackbar}
          onChange={(v) => featureFlagsStore.set({ enableUndoSnackbar: v })}
          onReset={() => featureFlagsStore.resetField('enableUndoSnackbar')}
        />
      )}
      {matches('Swipe Delete', 'flags.enableSwipeDelete') && (
        <ToggleRow
          id="flags.enableSwipeDelete" label="Swipe Delete"
          hint="When off, item rows use a plain delete button instead of swipe."
          checked={flags.enableSwipeDelete}
          onChange={(v) => featureFlagsStore.set({ enableSwipeDelete: v })}
          onReset={() => featureFlagsStore.resetField('enableSwipeDelete')}
        />
      )}
      {matches('Demo Mode', 'flags.enableDemoMode') && (
        <ToggleRow
          id="flags.enableDemoMode" label="Demo Mode"
          hint="One-time swipe-discovery hint row shown on an empty list."
          checked={flags.enableDemoMode}
          onChange={(v) => featureFlagsStore.set({ enableDemoMode: v })}
          onReset={() => featureFlagsStore.resetField('enableDemoMode')}
        />
      )}
      {matches('Haptics', 'flags.enableHaptics') && (
        <ToggleRow
          id="flags.enableHaptics" label="Haptics"
          hint="Vibration feedback when a swipe crosses the delete threshold."
          checked={flags.enableHaptics}
          onChange={(v) => featureFlagsStore.set({ enableHaptics: v })}
          onReset={() => featureFlagsStore.resetField('enableHaptics')}
        />
      )}
      {matches('Experimental Features', 'flags.enableExperimentalFeatures') && (
        <ToggleRow
          id="flags.enableExperimentalFeatures" label="Experimental Features"
          hint="Reserved - no feature is gated on this yet."
          checked={flags.enableExperimentalFeatures}
          onChange={(v) => featureFlagsStore.set({ enableExperimentalFeatures: v })}
          onReset={() => featureFlagsStore.resetField('enableExperimentalFeatures')}
        />
      )}
      <div className="px-4 py-3">
        <ActionButton label="Restore Defaults" onClick={() => featureFlagsStore.reset()} />
      </div>
    </Section>
  );
}
