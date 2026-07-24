// src/devtools/Swipe/SwipeSection.tsx
import { Section, SliderRow, ActionButton } from '../shared/controls';
import { swipeStore } from './store';

export default function SwipeSection({
  expanded, onToggle, visible, matches,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean; matches: (label: string, id?: string) => boolean;
}) {
  const swipe = swipeStore.useValue();

  return (
    <Section title="Swipe Settings" expanded={expanded} onToggle={onToggle} visible={visible}>
      {matches('Reveal Threshold', 'swipe.revealThreshold') && (
        <SliderRow
          id="swipe.revealThreshold" label="Reveal Threshold" unit="px"
          hint="Drag distance at which a released row snaps open to reveal the delete action."
          value={swipe.revealThreshold} min={20} max={200} step={5}
          onChange={(v) => swipeStore.set({ revealThreshold: v })}
          onReset={() => swipeStore.resetField('revealThreshold')}
        />
      )}
      {matches('Reveal Duration', 'swipe.revealDuration') && (
        <SliderRow
          id="swipe.revealDuration" label="Reveal Duration" unit="ms"
          hint="Transition duration for the row sliding open/closed."
          value={swipe.revealDuration} min={0} max={1000} step={10}
          onChange={(v) => swipeStore.set({ revealDuration: v })}
          onReset={() => swipeStore.resetField('revealDuration')}
        />
      )}
      {matches('Auto Close Delay', 'swipe.autoCloseDelay') && (
        <SliderRow
          id="swipe.autoCloseDelay" label="Auto Close Delay" unit="ms"
          hint="How long an open (revealed, undeleted) row waits before closing itself. 0 disables auto-close."
          value={swipe.autoCloseDelay} min={0} max={5000} step={100}
          onChange={(v) => swipeStore.set({ autoCloseDelay: v })}
          onReset={() => swipeStore.resetField('autoCloseDelay')}
        />
      )}
      {matches('Animation Duration', 'swipe.animationDuration') && (
        <SliderRow
          id="swipe.animationDuration" label="Animation Duration" unit="ms"
          hint="Duration of the delete slide/fade/collapse choreography."
          value={swipe.animationDuration} min={0} max={1000} step={10}
          onChange={(v) => swipeStore.set({ animationDuration: v })}
          onReset={() => swipeStore.resetField('animationDuration')}
        />
      )}
      {matches('Discovery Hint Hold Duration', 'swipe.discoveryHintHoldMs') && (
        <SliderRow
          id="swipe.discoveryHintHoldMs" label="Discovery Hint Hold Duration" unit="ms"
          hint="How long the one-time automatic discovery hint stays fully revealed before closing. Affects only that hint, not real swipe behavior."
          value={swipe.discoveryHintHoldMs} min={0} max={5000} step={100}
          onChange={(v) => swipeStore.set({ discoveryHintHoldMs: v })}
          onReset={() => swipeStore.resetField('discoveryHintHoldMs')}
        />
      )}
      <div className="px-4 py-3">
        <ActionButton label="Restore Defaults" onClick={() => swipeStore.reset()} />
      </div>
    </Section>
  );
}
