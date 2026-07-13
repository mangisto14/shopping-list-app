// src/components/presence/PresencePanel.tsx
import PresenceIndicator from './PresenceIndicator';

// Strict superset of Member (src/components/shopping/MemberAvatar.tsx):
// same id/name/avatar/online fields plus lastSeen. That means this data
// can be passed anywhere a Member is expected (ShoppingHeader,
// MemberAvatarGroup, MemberCard) with zero changes to those components.
export interface PresenceUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  lastSeen?: string | null;
}

// TODO (Future): Supabase Presence API - subscribe to a per-list
// presence channel (supabase.channel(...).on('presence', {event: ...},
// ...)) and derive this array from real synced state.
// TODO (Future): realtime online tracking - react to join/leave events
// as they happen instead of a static snapshot.
// TODO (Future): away status - see PresenceIndicator's TODO.
// TODO (Future): typing indicators - who's currently editing an item.
// TODO (Future): current editor - highlight which item is being edited
// by whom, for live conflict awareness.
//
// This is now the single canonical mock member/presence array - it
// replaces MembersPanel.tsx's former mockMembers export rather than
// living alongside it.
export const mockPresence: PresenceUser[] = [
  { id: '1', name: 'יוסף', avatar: '👨', online: true, lastSeen: null },
  { id: '2', name: 'שרה', avatar: '👩', online: true, lastSeen: null },
  { id: '3', name: 'נועה', avatar: '👧', online: false, lastSeen: '5 דקות' },
];

export default function PresencePanel() {
  const onlineCount = mockPresence.filter((u) => u.online).length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">מי מחובר עכשיו</h2>
        <span className="text-xs font-medium text-emerald-600">
          {onlineCount} מתוך {mockPresence.length} מחוברים
        </span>
      </div>

      <ul className="space-y-2">
        {mockPresence.map((user) => (
          <li key={user.id} className="flex items-center gap-2 text-sm">
            <PresenceIndicator online={user.online} />
            <span className="font-medium text-gray-800">{user.name}</span>
            {!user.online && user.lastSeen && (
              <span className="text-xs text-gray-400">לפני {user.lastSeen}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
