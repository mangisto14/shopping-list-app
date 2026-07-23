// src/devtools/NetworkSimulation/RealtimeGuard.tsx
// Mounted once at the app root (dev-gated, see devtools/index.ts's
// DevToolsOverlay). Drops the Supabase Realtime connection while
// "Disable Realtime" is on. Note this only guarantees the *initial*
// drop - supabase-js may auto-reconnect on its own if something
// subscribes to a new channel afterward, which is a client-library
// behavior outside this module's control. Toggling it off (or the
// Realtime section's own "Reconnect" button) restores the connection.
import { useEffect } from 'react';
import { networkSimulationStore } from './store';
import { supabase } from '../../supabase/client';

export default function RealtimeGuard() {
  const { disableRealtime } = networkSimulationStore.useValue();

  useEffect(() => {
    if (disableRealtime) {
      supabase.realtime.disconnect();
    }
  }, [disableRealtime]);

  return null;
}
