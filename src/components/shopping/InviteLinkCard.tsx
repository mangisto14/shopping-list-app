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
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500">קישור הזמנה</p>
      <div className="flex items-center gap-2">
        <p
          dir="ltr"
          className="flex-1 min-w-0 truncate text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 font-mono"
        >
          {MOCK_INVITE_LINK.url}
        </p>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
            copied ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {copied ? '✓ הועתק' : 'העתק קישור'}
        </button>
      </div>
    </div>
  );
}
