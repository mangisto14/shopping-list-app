// src/components/shopping/ShoppingHeader.tsx
import type { Member } from '../ui/MemberAvatar';
import MemberAvatarGroup from './MemberAvatarGroup';
import InviteMemberButton from './InviteMemberButton';

interface ShoppingHeaderProps {
  title: string;
  subtitle: string;
  totalItems: number;
  completedItems: number;
  itemsLabel: string;
  completedLabel: string;
  members: Member[];
  onInvite: () => void;
}

// Was showing a fabricated "X מחוברים" (X online) claim derived from
// mock presence data. Real list_members has no online/offline signal
// without a Supabase Presence channel (out of scope this phase - no
// realtime changes), so this now shows the real total member count
// instead of a presence claim we can't back up.
export default function ShoppingHeader({
  title,
  subtitle,
  totalItems,
  completedItems,
  itemsLabel,
  completedLabel,
  members,
  onInvite,
}: ShoppingHeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <MemberAvatarGroup members={members} />
        <h1 className="text-lg font-bold text-gray-800 truncate">{title}</h1>
      </div>

      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{totalItems}</span> {itemsLabel}
          {'  •  '}
          <span className="font-semibold text-gray-700">{completedItems}</span> {completedLabel}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-violet-600 font-medium bg-violet-50 rounded-full px-2.5 py-1">
            {members.length} בני משפחה
          </span>
          <InviteMemberButton onClick={onInvite} variant="ghost" />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
    </div>
  );
}
