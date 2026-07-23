// src/devtools/DevToolsOverlay.tsx
// The one component App.jsx mounts at the app root for every "applies
// everywhere, not just on the console page" devtools effect (UI Debug
// overlays, Direction/Theme overrides, the Realtime-disable guard).
// App.jsx only needs to know this one name, gated the same way as the
// route and menu entry.
import UiDebugOverlay from './DebugOverlay/UiDebugOverlay';
import AppearanceEffects from './Appearance/AppearanceEffects';
import RealtimeGuard from './NetworkSimulation/RealtimeGuard';

export default function DevToolsOverlay() {
  return (
    <>
      <UiDebugOverlay />
      <AppearanceEffects />
      <RealtimeGuard />
    </>
  );
}
