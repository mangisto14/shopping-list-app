// src/components/shopping/InviteLinkCard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useActiveList } from '../../ActiveListContext';
import { friendlyErrorMessage } from '../../utils/friendlyError';

// Priority: VITE_APP_URL, if set, wins - configure this in production/
// preview deployments so invite links point at the canonical domain
// (e.g. https://mangisto.best) rather than whatever host happened to
// serve the page. Falls back to window.location.origin so this works
// correctly with zero configuration in every other environment (local
// dev, a Vercel preview URL, etc.) - e.g.
// https://shopping-list.vercel.app/invite/<token>.
function getInviteBaseUrl(): string {
  const configured = import.meta.env.VITE_APP_URL;
  if (configured) return String(configured).replace(/\/+$/, '');
  return window.location.origin;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'not-owner' }
  | { status: 'error' };

// Shared by the mount effect and handleRevoke's "generate a replacement"
// step - both just need "call create_invite_link, turn the result into
// a State". Not a hook itself (no state of its own), so it's fine to
// call from a plain event handler too, not just an effect.
async function fetchOrCreateLink(listId: string, setState: (s: State) => void) {
  const { data, error } = await supabase.rpc('create_invite_link', { p_list_id: listId });
  if (error) {
    setState(error.message === 'not_owner' ? { status: 'not-owner' } : { status: 'error' });
    return;
  }
  // supabase-js returns a `returns table(...)` RPC as an array of rows.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token) {
    setState({ status: 'error' });
    return;
  }
  setState({ status: 'ready', url: `${getInviteBaseUrl()}/invite/${row.token}` });
}

export default function InviteLinkCard() {
  const { activeListId } = useActiveList();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!activeListId) {
      setState({ status: 'error' });
      return;
    }

    setState({ status: 'loading' });
    fetchOrCreateLink(activeListId, (s) => {
      if (!cancelled) setState(s);
    });

    return () => {
      cancelled = true;
    };
  }, [activeListId]);

  const handleRevoke = async () => {
    if (state.status !== 'ready' || !activeListId || revoking) return;
    if (!window.confirm('לבטל את קישור ההזמנה הנוכחי וליצור קישור חדש?')) return;

    setRevoking(true);
    const { error } = await supabase.rpc('revoke_invite_link', { p_list_id: activeListId });
    if (error) {
      setState({ status: 'error' });
      setRevoking(false);
      return;
    }

    // Immediately generate the replacement link - create_invite_link
    // finds no active link right after a revoke, so this always mints
    // a fresh token rather than leaving the owner with no link shown.
    await fetchOrCreateLink(activeListId, setState);
    setRevoking(false);
  };

  const handleCopy = async () => {
    if (state.status !== 'ready') return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context, etc.)
      // - fail silently rather than show a false success state.
    }
  };

  const handleShare = async () => {
    if (state.status !== 'ready') return;
    if (!navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({ url: state.url, title: 'הזמנה למשפחה' });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // User cancelled the share sheet, or the API/permission isn't
      // available in this context - not an error worth surfacing.
    }
  };

  if (state.status === 'loading') {
    return (
      <div className="bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] p-4">
        <p className="text-sm font-medium text-gray-400">טוען קישור הזמנה...</p>
      </div>
    );
  }

  if (state.status === 'not-owner') {
    return (
      <div className="bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] p-4">
        <p className="text-sm font-medium text-gray-500">{friendlyErrorMessage('not_owner', 'he', 'invite')}</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] p-4">
        <p className="text-sm font-medium text-gray-500">{friendlyErrorMessage(null, 'he', 'invite')}</p>
      </div>
    );
  }

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
          {state.url}
        </p>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 rounded-xl px-4 h-[42px] text-sm font-bold transition-all active:scale-95 ${
            copied ? 'bg-green-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          {copied ? '✓ הועתק' : 'העתקה'}
        </button>
        {/* Only rendered when the Web Share API actually exists (mobile
            browsers, mostly) - on desktop this button would either not
            appear or silently fall back to copy, so skip the ambiguity
            and just not render it there at all. */}
        {typeof navigator !== 'undefined' && !!navigator.share && (
          <button
            onClick={handleShare}
            aria-label="שיתוף קישור"
            className={`flex-shrink-0 rounded-xl w-[42px] h-[42px] flex items-center justify-center text-base transition-all active:scale-95 ${
              shared ? 'bg-green-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {shared ? '✓' : '↗️'}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-400">כל מי שמצטרף עם הקישור יצטרף לרשימה הזו</p>
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="flex-shrink-0 text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          {revoking ? 'מבטל...' : 'ביטול הקישור'}
        </button>
      </div>
    </div>
  );
}
