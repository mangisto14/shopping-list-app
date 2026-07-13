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
      className={`flex-1 min-w-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium border transition-all truncate ${
        noneOnline ? 'bg-gray-50 text-gray-500 border-gray-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
      }`}
    >
      <span className={`text-xs flex-shrink-0 ${noneOnline ? '' : 'animate-pulse'}`}>{noneOnline ? '⚪' : '🟢'}</span>
      <span className="truncate">{message}</span>
    </div>
  );
}
