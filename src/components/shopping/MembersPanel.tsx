// src/components/shopping/MembersPanel.tsx
import { useState } from 'react';
import type { Member } from './MemberAvatar';
import MemberCard from './MemberCard';

// TODO (Future): load members from the list_members table (already
// used by useLists.ts / Lists.tsx) joined with a profiles table for
// display name/avatar - list_members currently only stores user_id,
// the same gap already flagged on the Lists page's member panel.
// TODO (Future): realtime online presence - e.g. Supabase Presence on
// a per-list channel - replacing the static `online` boolean below.
// TODO (Future): member invitations - inviting someone isn't
// implemented anywhere yet; every member panel in the app is read-only
// so far.
export const mockMembers: Member[] = [
  { id: '1', name: 'יוסף', avatar: '👨', online: true },
  { id: '2', name: 'שרה', avatar: '👩', online: true },
  { id: '3', name: 'נועה', avatar: '👧', online: false },
];

export default function MembersPanel() {
  const [expanded, setExpanded] = useState(true);
  const onlineCount = mockMembers.filter((m) => m.online).length;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
          <span>👨‍👩‍👧</span>
          בני המשפחה
        </span>
        <span className="flex items-center gap-2 text-sm">
          <span className="text-emerald-600 font-medium">{onlineCount} מחוברים</span>
          <span className={`inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}>⌄</span>
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {mockMembers.map((member, i) => (
            <MemberCard key={member.id} member={member} isOwner={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
