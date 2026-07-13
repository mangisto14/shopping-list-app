// src/components/live/LiveActivityBanner.tsx
import { useEffect, useState } from 'react';
import { mockLiveActivity, LIVE_ACTION_CONFIG } from './LiveActivityCard';

// Compact, pinned "who's doing what right now" strip. Rotates through
// mockLiveActivity on a timer with a short fade transition, Google
// Docs/Notion presence-strip style. Mock-only: a real implementation
// would drive `index`/`current` from a live Supabase Presence or
// Broadcast subscription instead of setInterval.
export default function LiveActivityBanner() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (mockLiveActivity.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      const fadeOut = setTimeout(() => {
        setIndex((i) => (i + 1) % mockLiveActivity.length);
        setVisible(true);
      }, 200);
      return () => clearTimeout(fadeOut);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  if (mockLiveActivity.length === 0) return null;

  const current = mockLiveActivity[index];
  const config = LIVE_ACTION_CONFIG[current.action];

  return (
    <div
      className={`flex-1 min-w-0 flex items-center gap-1.5 rounded-full border border-gray-100 ${config.bg} px-3 py-2 text-xs transition-all truncate`}
    >
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.text} opacity-75`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.text}`} style={{ backgroundColor: 'currentColor' }} />
      </span>
      <span
        className={`flex items-center gap-1 min-w-0 truncate transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="flex-shrink-0">{current.avatar}</span>
        <span className="font-semibold text-gray-800 truncate">{current.user}</span>
        <span className={`font-medium flex-shrink-0 ${config.text}`}>{config.verb}</span>
        <span className="font-medium text-gray-800 truncate">{current.item}</span>
      </span>
    </div>
  );
}
