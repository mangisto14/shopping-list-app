// src/components/shopping/MemberCard.tsx
import type { Member } from './MemberAvatar';
import MemberAvatar from './MemberAvatar';

interface MemberCardProps {
  member: Member;
  // TODO (Future): replace with a real role once list_members supports
  // roles beyond owner/member. Phase 1A's design intentionally deferred
  // a role column since the app only needed "owner manages members" -
  // see supabase/migrations. This prop is a display-only placeholder
  // with no backing data.
  isOwner?: boolean;
}

export default function MemberCard({ member, isOwner }: MemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:shadow-md transition-all">
      <div className="flex-shrink-0">
        <MemberAvatar name={member.name} avatar={member.avatar} online={member.online} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <span className={member.online ? 'text-emerald-500' : 'text-gray-300'}>
            {member.online ? '●' : '○'}
          </span>
          {member.online ? 'מחובר/ת' : 'לא מחובר/ת'}
        </p>
      </div>

      {/* TODO (Future): real role badge once role data exists on
          list_members - this is a static placeholder derived from the
          isOwner prop, not from any query. */}
      <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
        {isOwner ? 'בעלים' : 'חבר/ה'}
      </span>
    </div>
  );
}
