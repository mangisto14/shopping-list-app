// src/components/ui/MemberAvatar.tsx
import { memo } from 'react';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  // Optional: real membership data has no presence signal without a
  // Supabase Presence/Broadcast channel (not part of this UI-only
  // phase). Omit rather than fabricate true/false; the presence dot
  // below only renders when this is actually known.
  online?: boolean;
}

interface MemberAvatarProps {
  name: string;
  avatar: string;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
  // Small corner tag (e.g. "★" for owner) - optional, off by default.
  roleBadge?: string;
}

const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-lg',
  lg: 'w-12 h-12 text-xl',
};

// Single source of truth for member avatars - previously duplicated
// as shopping/MemberAvatar.tsx (6 importers migrated here, old file
// removed rather than kept alongside this one).
function MemberAvatar({ name, avatar, online, size = 'md', roleBadge }: MemberAvatarProps) {
  return (
    <div className="relative inline-flex group">
      <span
        className={`${SIZE_CLASSES[size]} rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center transition-all group-hover:scale-110`}
      >
        {avatar}
      </span>

      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white transition-colors ${
            online ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
      )}

      {roleBadge && (
        <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center border-2 border-white">
          {roleBadge}
        </span>
      )}

      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all z-10">
        {name}
      </span>
    </div>
  );
}

export default memo(MemberAvatar);
