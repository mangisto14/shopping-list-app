// src/components/shopping/ShoppingHeader.tsx
import type { Member } from './MemberAvatar';
import MemberAvatarGroup from './MemberAvatarGroup';
import InviteMemberButton from './InviteMemberButton';
import PresenceIndicator from '../presence/PresenceIndicator';

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
  const onlineCount = members.filter((m) => m.online).length;

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
          <span className="text-xs text-violet-600 font-medium flex items-center gap-1 bg-violet-50 rounded-full px-2.5 py-1">
            <PresenceIndicator online={onlineCount > 0} />
            {onlineCount} מחוברים
          </span>
          <InviteMemberButton onClick={onInvite} variant="ghost" />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
    </div>
  );
}
