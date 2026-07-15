// src/components/shopping/ShoppingHeader.tsx
import type { Member } from '../ui/MemberAvatar';
import MemberAvatarGroup from './MemberAvatarGroup';

interface ShoppingHeaderProps {
  title: string;
  subtitle: string;
  totalItems: number;
  members: Member[];
  onInvite: () => void;
}

// Matches the Claude Design's main-list header: no card chrome, large
// title with an inline presence line, avatar stack + a circular action
// button on the other side. Item/completed counts moved to the
// "לקנות · N" / "הושלמו · N" section labels above the list itself
// (design doesn't repeat them in the header); the member list and
// invite flow now live on the Family screen, matching the design's IA.
export default function ShoppingHeader({ title, subtitle, totalItems, members, onInvite }: ShoppingHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight truncate">{title}</h1>
        <div className="flex items-center gap-1.5">
          <span className="w-[7px] h-[7px] rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-[13px] font-medium text-gray-500 truncate">
            {subtitle} · {members.length} מחוברים · {totalItems} פריטים
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <MemberAvatarGroup members={members} />
        <button
          onClick={onInvite}
          aria-label="הזמן חבר"
          className="w-10 h-10 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.05)] flex items-center justify-center text-blue-600"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
