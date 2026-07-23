// src/devtools/Realtime/RealtimeSection.tsx
import { useEffect, useState } from 'react';
import { Section, InfoRow, ActionButton } from '../shared/controls';
import { useLastRealtimeEvent } from './eventStore';
import { triggerForceSync } from './forceSync';
import { useActiveList } from '../../ActiveListContext';
import { useAuth } from '../../hooks/useAuth';
import { useMembers } from '../../hooks/useMembers';
import { supabase } from '../../supabase/client';

export default function RealtimeSection({
  expanded, onToggle, visible,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean;
}) {
  const { activeList, activeListId } = useActiveList();
  const { user } = useAuth();
  const { members } = useMembers();
  const lastEvent = useLastRealtimeEvent();
  const [connectionState, setConnectionState] = useState(() => supabase.realtime.connectionState());

  useEffect(() => {
    const id = window.setInterval(() => setConnectionState(supabase.realtime.connectionState()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Section title="Realtime Debug" expanded={expanded} onToggle={onToggle} visible={visible}>
      <InfoRow label="Connection Status" value={connectionState} />
      <InfoRow label="Current User" value={user?.id ?? '—'} />
      <InfoRow label="Current List" value={activeList?.name ?? '—'} />
      <InfoRow label="Connected Members" value={`${members.length} (list members, not live presence)`} />
      <InfoRow
        label="Last Realtime Event"
        value={lastEvent ? `${lastEvent.table} ${lastEvent.event} @ ${new Date(lastEvent.at).toLocaleTimeString()}` : 'none yet'}
      />
      <div className="px-4 py-3 flex gap-2">
        <div className="flex-1">
          <ActionButton
            label="Reconnect"
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
      {!activeListId && <p className="px-4 pb-3 text-xs text-gray-400">No active list selected.</p>}
    </Section>
  );
}
