// src/components/shopping/MemberAvatar.tsx
export interface Member {
  id: string;
  name: string;
  avatar: string;
  // Optional: real membership data has no presence signal without a
  // Supabase Presence/Broadcast channel (out of scope - no realtime
  // changes this phase). Omit rather than fabricate true/false; the
  // presence dot below only renders when this is actually known.
  online?: boolean;
}

interface MemberAvatarProps {
  name: string;
  avatar: string;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-lg',
  lg: 'w-12 h-12 text-xl',
};

export default function MemberAvatar({ name, avatar, online, size = 'md' }: MemberAvatarProps) {
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
            online ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
        />
      )}

      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all z-10">
        {name}
      </span>
    </div>
  );
}
