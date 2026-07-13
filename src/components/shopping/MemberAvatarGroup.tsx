// src/components/shopping/MemberAvatarGroup.tsx
import type { Member } from './MemberAvatar';
import MemberAvatar from './MemberAvatar';

interface MemberAvatarGroupProps {
  members: Member[];
  max?: number;
}

export default function MemberAvatarGroup({ members, max = 4 }: MemberAvatarGroupProps) {
  const visible = members.slice(0, max);
  const remaining = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2 space-x-reverse">
      {visible.map((member) => (
        <MemberAvatar key={member.id} name={member.name} avatar={member.avatar} online={member.online} size="sm" />
      ))}
      {remaining > 0 && (
        <span className="w-8 h-8 rounded-full bg-gray-700 text-white border-2 border-white shadow-sm flex items-center justify-center text-xs font-semibold">
          +{remaining}
        </span>
      )}
    </div>
  );
}
