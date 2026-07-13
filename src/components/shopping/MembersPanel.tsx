// src/components/shopping/MembersPanel.tsx
import { useState } from 'react';
import MemberCard from './MemberCard';
import InviteMemberButton from './InviteMemberButton';
import { mockPresence } from '../presence/PresencePanel';

// TODO (Future): load members from the list_members table (already
// used by useLists.ts / Lists.tsx) joined with a profiles table for
// display name/avatar - list_members currently only stores user_id,
// the same gap already flagged on the Lists page's member panel.
// Realtime presence now has its own mock-backed components (see
// src/components/presence/) - mockPresence there is the canonical
// member/presence array, replacing what used to be a separate
// mockMembers export here.
// Invite UI now exists (InviteMemberButton -> InviteMemberModal), but
// it's mock-only - see InviteMemberModal's own TODOs for connecting it
// to list_members and a real accept-invite flow.

interface MembersPanelProps {
  onInvite: () => void;
}

export default function MembersPanel({ onInvite }: MembersPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const onlineCount = mockPresence.filter((m) => m.online).length;

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
        <div className="px-3 pb-3 space-y-3">
          <InviteMemberButton onClick={onInvite} variant="ghost" />
          <div className="space-y-2">
            {mockPresence.map((member, i) => (
              <MemberCard key={member.id} member={member} isOwner={i === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
