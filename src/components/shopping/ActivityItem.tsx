// src/components/shopping/ActivityItem.tsx
export type ActivityType = 'added' | 'completed' | 'deleted';

export interface ActivityEvent {
  id: string;
  userName: string;
  userAvatar: string;
  action: ActivityType;
  itemName: string;
  createdAt: string; // ISO timestamp
}

interface ActivityTypeConfig {
  icon: string;
  bg: string;
  text: string;
  // Slash-suffix form (e.g. "הוסיף/ה") - the standard Hebrew UI
  // convention for a verb that must read correctly regardless of the
  // (unknown, in a real future feed) actor's gender.
  verb: string;
}

const ACTIVITY_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  added: { icon: '➕', bg: 'bg-blue-50', text: 'text-blue-600', verb: 'הוסיף/ה' },
  completed: { icon: '✅', bg: 'bg-emerald-50', text: 'text-emerald-600', verb: 'סימן/ה כנקנה' },
  deleted: { icon: '🗑️', bg: 'bg-red-50', text: 'text-red-600', verb: 'מחק/ה' },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  const diffDays = Math.round(diffHours / 24);
  return `לפני ${diffDays} ימים`;
}

interface ActivityItemProps {
  event: ActivityEvent;
}

export default function ActivityItem({ event }: ActivityItemProps) {
  const config = ACTIVITY_CONFIG[event.action];

  return (
    <li className="flex items-start gap-3 px-4 py-2.5 transition-all hover:bg-gray-50">
      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg">
        {event.userAvatar}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">
          <span className="font-semibold">{event.userName}</span>{' '}
          <span className={config.text}>{config.verb}</span>{' '}
          <span className="font-medium">{event.itemName}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(event.createdAt)}</p>
      </div>

      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full ${config.bg} ${config.text} flex items-center justify-center text-xs`}
      >
        {config.icon}
      </span>
    </li>
  );
}
