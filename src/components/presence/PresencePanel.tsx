// src/components/presence/PresencePanel.tsx
import type { Member } from '../shopping/MemberAvatar';

interface PresencePanelProps {
  members: Member[];
}

// Was mock-only ("who's online now"), fed by a hardcoded mockPresence
// array. Real list_members data has no online/offline signal without a
// Supabase Presence channel (out of scope this phase - no realtime
// changes), so this now shows real membership only, not presence.
export default function PresencePanel({ members }: PresencePanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">מי ברשימה</h2>
        <span className="text-xs font-medium text-gray-500">{members.length} בני משפחה</span>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">אין עדיין חברים ברשימה זו</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {member.avatar}
              </span>
              <span className="font-medium text-gray-800">{member.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
