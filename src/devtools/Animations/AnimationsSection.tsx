// src/devtools/Animations/AnimationsSection.tsx
import { Section, SliderRow, ActionButton } from '../shared/controls';
import { animationsStore } from './store';

export default function AnimationsSection({
  expanded, onToggle, visible, matches,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean; matches: (label: string, id?: string) => boolean;
}) {
  const animations = animationsStore.useValue();

  return (
    <Section title="Animation Settings" expanded={expanded} onToggle={onToggle} visible={visible}>
      {matches('Bottom Sheet', 'animations.bottomSheetDuration') && (
        <SliderRow
          id="animations.bottomSheetDuration" label="Bottom Sheet" unit="ms"
          hint="BottomSheet open/close slide + backdrop fade duration."
          value={animations.bottomSheetDuration} min={0} max={1000} step={10}
          onChange={(v) => animationsStore.set({ bottomSheetDuration: v })}
          onReset={() => animationsStore.resetField('bottomSheetDuration')}
        />
      )}
      {matches('FAB', 'animations.fabAnimationDuration') && (
        <SliderRow
          id="animations.fabAnimationDuration" label="FAB" unit="ms"
          hint="Floating add-button tap pulse/ping duration."
          value={animations.fabAnimationDuration} min={0} max={2000} step={50}
          onChange={(v) => animationsStore.set({ fabAnimationDuration: v })}
          onReset={() => animationsStore.resetField('fabAnimationDuration')}
        />
      )}
      {matches('Snackbar', 'animations.snackbarDuration') && (
        <SliderRow
          id="animations.snackbarDuration" label="Snackbar" unit="ms"
          hint="How long the post-delete Undo snackbar stays up before the deletion commits."
          value={animations.snackbarDuration} min={500} max={15000} step={250}
          onChange={(v) => animationsStore.set({ snackbarDuration: v })}
          onReset={() => animationsStore.resetField('snackbarDuration')}
        />
      )}
      {matches('List Item Animation', 'animations.listItemAnimationDuration') && (
        <SliderRow
          id="animations.listItemAnimationDuration" label="List Item Animation" unit="ms"
          hint="Category group expand/collapse transition duration."
          value={animations.listItemAnimationDuration} min={0} max={1000} step={10}
          onChange={(v) => animationsStore.set({ listItemAnimationDuration: v })}
          onReset={() => animationsStore.resetField('listItemAnimationDuration')}
        />
      )}
      {matches('Page Transition', 'animations.pageTransitionDuration') && (
        <SliderRow
          id="animations.pageTransitionDuration" label="Page Transition" unit="ms"
          hint="Fade duration when switching between pages/routes."
          value={animations.pageTransitionDuration} min={0} max={1000} step={10}
          onChange={(v) => animationsStore.set({ pageTransitionDuration: v })}
          onReset={() => animationsStore.resetField('pageTransitionDuration')}
        />
      )}
      <div className="px-4 py-3">
        <ActionButton label="Restore Defaults" onClick={() => animationsStore.reset()} />
      </div>
    </Section>
  );
}
