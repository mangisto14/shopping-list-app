// src/components/presence/LiveStatusBanner.tsx
import type { PresenceUser } from './PresencePanel';

interface LiveStatusBannerProps {
  users: PresenceUser[];
}

export default function LiveStatusBanner({ users }: LiveStatusBannerProps) {
  const onlineCount = users.filter((u) => u.online).length;
  const allOnline = users.length > 0 && onlineCount === users.length;
  const noneOnline = onlineCount === 0;

  const memberPhrase = onlineCount === 1 ? 'חבר אחד מחובר' : `${onlineCount} חברים מחוברים`;
  const message = allOnline
    ? 'כל בני המשפחה מחוברים'
    : noneOnline
    ? 'אף אחד לא מחובר כרגע'
    : `${memberPhrase} עכשיו`;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${
        noneOnline ? 'bg-gray-50 text-gray-500 border-gray-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
      }`}
    >
      <span className={`text-xs ${noneOnline ? '' : 'animate-pulse'}`}>{noneOnline ? '⚪' : '🟢'}</span>
      {message}
    </div>
  );
}
