// src/components/shopping/ActivityFeed.tsx
import ActivityItem, { type ActivityEvent } from './ActivityItem';

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

// TODO (Future): replace MOCK_ACTIVITY with a real collaborative
// activity stream. Two viable directions once this is wired up for
// real: (1) subscribe to items/categories postgres_changes the same
// way useItems/useCategories already do via useRealtimeTable, and
// derive ActivityEvent rows from INSERT/UPDATE(is_done)/DELETE payloads
// client-side - no schema change needed, but history is only what's
// been seen live, not persisted; or (2) a dedicated `activity_log`
// table (list_id, user_id, action, item_name, created_at) written
// alongside item/category mutations, if durable cross-session history
// is wanted. Either way, real user names/avatars still need a
// `profiles` table - the same gap already flagged on the Lists page's
// member panel and the Shopping List header's mock avatars.
const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: '1', userName: 'יוסף', userAvatar: '👨', action: 'added', itemName: 'חלב', createdAt: minutesAgo(2) },
  { id: '2', userName: 'שרה', userAvatar: '👩', action: 'completed', itemName: 'ביצים', createdAt: minutesAgo(5) },
  { id: '3', userName: 'נועה', userAvatar: '👧', action: 'deleted', itemName: 'קולה', createdAt: minutesAgo(10) },
];

export default function ActivityFeed() {
  if (MOCK_ACTIVITY.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <span>🔔</span>
          פעילות אחרונה
        </h2>
      </div>
      <ul className="divide-y divide-gray-50">
        {MOCK_ACTIVITY.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </ul>
    </div>
  );
}
