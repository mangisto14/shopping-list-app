// src/components/live/LiveEditingPanel.tsx
import LiveActivityCard, { mockLiveActivity } from './LiveActivityCard';
import TypingIndicator from './TypingIndicator';

// Standalone mock typing demo - deliberately not folded into
// mockLiveActivity (which the task specifies as exactly 3 entries,
// adding/editing/completing, matching LiveActivityCard's own examples).
// TypingIndicator has a different, simpler shape (no action/item), so
// it's demonstrated separately rather than invented as a 4th
// LiveActivity entry not present in the given mock data.
const MOCK_TYPING_USER = { user: 'שרה', avatar: '👩' };

export default function LiveEditingPanel() {
  if (mockLiveActivity.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <span className="animate-pulse">🟢</span>
          פעילות בזמן אמת
        </h2>
        <TypingIndicator user={MOCK_TYPING_USER.user} avatar={MOCK_TYPING_USER.avatar} />
      </div>

      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
        {mockLiveActivity.map((activity) => (
          <LiveActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
