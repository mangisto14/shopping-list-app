// src/components/shopping/InviteLinkCard.tsx
import { useState } from 'react';

export interface InviteLink {
  code: string;
  url: string;
}

// Priority: VITE_APP_URL, if set, wins - configure this in production/
// preview deployments so invite links point at the canonical domain
// (e.g. https://mangisto.best) rather than whatever host happened to
// serve the page. Falls back to window.location.origin so this works
// correctly with zero configuration in every other environment (local
// dev, a Vercel preview URL, etc.) - e.g.
// https://shopping-list.vercel.app/invite/ABC123.
function getInviteBaseUrl(): string {
  const configured = import.meta.env.VITE_APP_URL;
  if (configured) return String(configured).replace(/\/+$/, '');
  return window.location.origin;
}

// TODO (Future): generate a real, secure, per-list invite token
// server-side (e.g. a signed token, or a row in a dedicated
// invite_links table with an expiry) instead of this fixed mock code.
const MOCK_INVITE_CODE = 'ABC123';

const MOCK_INVITE_LINK: InviteLink = {
  code: MOCK_INVITE_CODE,
  url: `${getInviteBaseUrl()}/invite/${MOCK_INVITE_CODE}`,
};

export default function InviteLinkCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_INVITE_LINK.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context, etc.)
      // - fail silently rather than show a false success state.
    }
  };

  return (
    <div className="bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] p-4 flex flex-col gap-2.5">
      <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
        <span>קישור הזמנה למשפחה</span>
        <span aria-hidden="true">🔗</span>
      </p>
      <div className="flex items-center gap-2">
        <p
          dir="ltr"
          className="flex-1 min-w-0 truncate text-[13px] text-gray-500 bg-slate-50 border border-gray-100 rounded-xl px-3 py-2.5 font-mono"
        >
          {MOCK_INVITE_LINK.url}
        </p>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 rounded-xl px-4 h-[42px] text-sm font-bold transition-all active:scale-95 ${
            copied ? 'bg-green-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          {copied ? '✓ הועתק' : 'העתקה'}
        </button>
      </div>
      <p className="text-xs font-medium text-gray-400">כל מי שמצטרף עם הקישור רואה את כל הרשימות</p>
    </div>
  );
}
