// src/components/shopping/ShoppingHeader.tsx
import type { Member } from './MemberAvatar';
import MemberAvatarGroup from './MemberAvatarGroup';

interface ShoppingHeaderProps {
  title: string;
  subtitle: string;
  totalItems: number;
  completedItems: number;
  itemsLabel: string;
  completedLabel: string;
  members: Member[];
}

export default function ShoppingHeader({
  title,
  subtitle,
  totalItems,
  completedItems,
  itemsLabel,
  completedLabel,
  members,
}: ShoppingHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-md p-5">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-white/80 mt-0.5">{subtitle}</p>

      <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
        <div className="flex gap-2">
          <span className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm font-medium">
            {totalItems} {itemsLabel}
          </span>
          <span className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm font-medium">
            {completedItems} {completedLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MemberAvatarGroup members={members} />
          <span className="text-xs text-white/80 font-medium">
            {members.length} {members.length === 1 ? 'חבר/ה פעיל/ה' : 'חברים פעילים'}
          </span>
        </div>
      </div>
    </div>
  );
}
