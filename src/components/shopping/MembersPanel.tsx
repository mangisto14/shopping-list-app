// src/components/shopping/MembersPanel.tsx
import { useState } from 'react';
import type { Member } from './MemberAvatar';
import MemberCard from './MemberCard';
import InviteMemberButton from './InviteMemberButton';

interface MembersPanelProps {
  members: Member[];
  ownerId?: string;
  onInvite: () => void;
}

// Was rendering the mockPresence array with a fake i===0 "isOwner"
// guess and a fabricated online count. Now takes real members (from
// the same list_members query Lists.tsx already runs) and derives
// ownership from the list's real owner_id - no more guessing, no more
// online claims we can't back up without a Presence channel.
export default function MembersPanel({ members, ownerId, onInvite }: MembersPanelProps) {
  const [expanded, setExpanded] = useState(true);

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
          <span className="text-gray-500 font-medium">{members.length} חברים</span>
          <span className={`inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}>⌄</span>
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <InviteMemberButton onClick={onInvite} variant="ghost" />
          {members.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">אין עדיין חברים ברשימה זו</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} isOwner={member.id === ownerId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
