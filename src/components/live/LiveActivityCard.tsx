// src/components/live/LiveActivityCard.tsx
export type LiveAction = 'adding' | 'editing' | 'completing' | 'deleting' | 'typing';

export interface LiveActivity {
  id: string;
  user: string;
  avatar: string;
  action: LiveAction;
  item: string;
}

interface LiveActionConfig {
  icon: string;
  bg: string;
  text: string;
  // Slash-suffix form, e.g. "מוסיף/ה" - same Hebrew gender-inclusive
  // convention already established for ActivityItem's ACTIVITY_CONFIG.
  verb: string;
}

export const LIVE_ACTION_CONFIG: Record<LiveAction, LiveActionConfig> = {
  adding: { icon: '➕', bg: 'bg-blue-50', text: 'text-blue-600', verb: 'מוסיף/ה' },
  editing: { icon: '✏️', bg: 'bg-purple-50', text: 'text-purple-600', verb: 'עורכ/ת' },
  completing: { icon: '✅', bg: 'bg-emerald-50', text: 'text-emerald-600', verb: 'מסמנ/ת כנקנה' },
  deleting: { icon: '🗑️', bg: 'bg-red-50', text: 'text-red-600', verb: 'מוחק/ת' },
  typing: { icon: '⌨️', bg: 'bg-amber-50', text: 'text-amber-600', verb: 'מקליד/ה' },
};

// TODO (Future): Supabase Presence - track real per-user "currently
// doing X" state via presence payload metadata instead of this mock
// list.
// TODO (Future): Broadcast Channels - use
// supabase.channel(...).send({type: 'broadcast', ...}) for ephemeral,
// non-persisted live actions (typing, editing) rather than
// postgres_changes, which only fires on committed DB writes and
// wouldn't capture "someone has this item's rename field focused".
// TODO (Future): live cursor - who's looking at/hovering which item,
// Figma-style.
// TODO (Future): real editing state - derive `editing` from an actual
// focused input rather than a static mock entry.
// TODO (Future): realtime activity stream - see ActivityFeed.tsx's own
// TODO for the (related but distinct - past vs. in-progress) history
// feed direction.
export const mockLiveActivity: LiveActivity[] = [
  { id: '1', user: 'יוסף', avatar: '👨', action: 'adding', item: 'חלב' },
  { id: '2', user: 'שרה', avatar: '👩', action: 'editing', item: 'ביצים' },
  { id: '3', user: 'נועה', avatar: '👧', action: 'completing', item: 'קפה' },
];

interface LiveActivityCardProps {
  activity: LiveActivity;
}

export default function LiveActivityCard({ activity }: LiveActivityCardProps) {
  const config = LIVE_ACTION_CONFIG[activity.action];

  return (
    <div className={`flex items-center gap-3 rounded-xl ${config.bg} px-3 py-2.5 transition-all`}>
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-base">
        {activity.avatar}
      </span>
      <p className="flex-1 min-w-0 text-sm text-gray-800 truncate">
        <span className="font-semibold">{activity.user}</span>{' '}
        <span className={`font-medium ${config.text}`}>{config.verb}</span>{' '}
        <span className="font-medium">{activity.item}</span>
      </p>
      <span className={`flex-shrink-0 text-sm ${config.text}`}>{config.icon}</span>
    </div>
  );
}
