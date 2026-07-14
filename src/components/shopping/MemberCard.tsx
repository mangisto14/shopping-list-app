// src/components/shopping/MemberCard.tsx
import type { Member } from '../ui/MemberAvatar';
import MemberAvatar from '../ui/MemberAvatar';

interface MemberCardProps {
  member: Member;
  // Real ownership: pass `member.id === activeList.owner_id`, not a
  // guess. `lists.owner_id` already exists (useLists.ts) - this isn't
  // a new data source, just using a field callers weren't wiring
  // through before.
  isOwner?: boolean;
}

// No presence badge here: real list_members data has no online/offline
// signal without a Supabase Presence channel (out of scope this phase -
// no realtime changes). Showing member identity + real role only.
export default function MemberCard({ member, isOwner }: MemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:shadow-md transition-all">
      <div className="flex-shrink-0">
        <MemberAvatar name={member.name} avatar={member.avatar} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
      </div>

      <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
        {isOwner ? 'בעלים' : 'חבר/ה'}
      </span>
    </div>
  );
}
