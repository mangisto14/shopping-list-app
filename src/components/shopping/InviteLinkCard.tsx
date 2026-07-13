// src/components/shopping/InviteLinkCard.tsx
import { useState } from 'react';

export interface InviteLink {
  code: string;
  url: string;
}

// TODO (Future): generate a real, secure, per-list invite token
// server-side (e.g. a signed token, or a row in a dedicated
// invite_links table with an expiry) instead of this fixed mock value.
const MOCK_INVITE_LINK: InviteLink = {
  code: 'ABC123',
  url: 'https://shopping-list.app/invite/ABC123',
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
