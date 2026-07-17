// src/components/shopping/FamilyHeroCard.tsx
import type { Member } from '../ui/MemberAvatar';
import MemberAvatarGroup from './MemberAvatarGroup';

interface FamilyHeroCardProps {
  listName: string;
  members: Member[];
  onInvite: () => void;
  inviteLabel: string;
}

// Gradient hero card at the top of the Family screen, matching the
// Claude Design. Uses the same members/inviteMember data and CTA the
// page already threads through InviteMemberModal - no new data source.
export default function FamilyHeroCard({ listName, members, onInvite, inviteLabel }: FamilyHeroCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[20px] px-[18px] pt-[18px] pb-4 text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xl font-extrabold truncate">{listName}</span>
          <span className="text-[13px] font-medium opacity-85">{members.length} חברים</span>
        </div>
        <MemberAvatarGroup members={members} />
      </div>

      <button
        onClick={onInvite}
        className="h-12 rounded-[14px] bg-white/16 border border-white/25 flex items-center justify-center gap-2 text-[15px] font-bold"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span>{inviteLabel}</span>
      </button>
    </div>
  );
}
