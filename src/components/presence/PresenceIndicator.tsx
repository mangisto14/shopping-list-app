// src/components/presence/PresenceIndicator.tsx
interface PresenceIndicatorProps {
  online: boolean;
  className?: string;
}

// TODO (Future): a third 'away' state (🟡) once presence data can
// express more than online/offline - e.g. a Supabase Presence payload
// carrying a status field, not just a boolean. Not added as an unused
// prop today since there's no data to back it yet.
export default function PresenceIndicator({ online, className = '' }: PresenceIndicatorProps) {
  return (
    <span className={`inline-block text-[10px] leading-none ${online ? 'animate-pulse' : ''} ${className}`}>
      {online ? '🟢' : '⚪'}
    </span>
  );
}
