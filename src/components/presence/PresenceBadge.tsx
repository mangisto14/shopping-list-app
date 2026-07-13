// src/components/presence/PresenceBadge.tsx
import PresenceIndicator from './PresenceIndicator';

interface PresenceBadgeProps {
  online: boolean;
}

// Used inside member cards. Keeps the app's established gender-inclusive
// Hebrew convention ("/ת", already used throughout - e.g. MemberCard's
// prior status line) rather than the task spec's plain "מחובר" example.
export default function PresenceBadge({ online }: PresenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 transition-colors ${
        online ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
      }`}
    >
      <PresenceIndicator online={online} />
      {online ? 'מחובר/ת' : 'לא מחובר/ת'}
    </span>
  );
}
