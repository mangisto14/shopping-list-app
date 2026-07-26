// src/pages/AcceptInvite.tsx
// Mounted only for authenticated users, at /invite/:token (see
// App.jsx). The logged-out visit to the same path is handled by a
// separate, tiny redirect-capturing element (also in App.jsx) that
// never reaches this component at all - by the time this renders, a
// Supabase session is guaranteed to exist, so join_list_by_token can
// be called immediately on mount with no extra auth check here.
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useActiveList } from '../ActiveListContext';
import { friendlyErrorMessage } from '../utils/friendlyError';
import EmptyState from '../components/ui/EmptyState';

type State =
  | { status: 'joining' }
  | { status: 'joined' }
  | { status: 'already-member' }
  | { status: 'error'; code: string | null };

// Redirect to the shopping list a beat after a successful/idempotent
// join, so the "you're in" message is actually readable rather than
// flashing past.
const REDIRECT_DELAY_MS = 1200;

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setActiveListId, refetchLists } = useActiveList();
  const [state, setState] = useState<State>({ status: 'joining' });

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setState({ status: 'error', code: 'invalid_link' });
      return;
    }

    supabase.rpc('join_list_by_token', { p_token: token }).then(async ({ data, error }) => {
      if (cancelled) return;

      if (error) {
        if (error.message === 'already_member') {
          setState({ status: 'already-member' });
          window.setTimeout(() => !cancelled && navigate('/', { replace: true }), REDIRECT_DELAY_MS);
          return;
        }
        setState({ status: 'error', code: error.message ?? null });
        return;
      }

      // join_list_by_token returns the joined list's id - switch to it
      // immediately so the user lands on the shared list, not whatever
      // list happened to be active before.
      const joinedListId = data as string | null;
      await refetchLists();
      if (!cancelled && joinedListId) setActiveListId(joinedListId);
      if (cancelled) return;

      setState({ status: 'joined' });
      window.setTimeout(() => !cancelled && navigate('/', { replace: true }), REDIRECT_DELAY_MS);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="max-w-md sm:max-w-lg mx-auto px-3 sm:px-4 pt-16">
      {state.status === 'joining' && (
        <EmptyState size="lg" icon="⏳" title="מצטרפ/ים לרשימה..." />
      )}
      {state.status === 'joined' && (
        <EmptyState size="lg" icon="🎉" title="הצטרפת בהצלחה!" description="מעבירים אותך לרשימה..." />
      )}
      {state.status === 'already-member' && (
        <EmptyState
          size="lg"
          icon="👋"
          title="כבר יש לך גישה"
          description={friendlyErrorMessage('already_member', 'he', 'inviteAccept')}
        />
      )}
      {state.status === 'error' && (
        <EmptyState
          size="lg"
          icon="⚠️"
          title="לא ניתן להצטרף"
          description={friendlyErrorMessage(state.code, 'he', 'inviteAccept')}
          actionLabel="חזרה לרשימה שלי"
          onAction={() => navigate('/', { replace: true })}
        />
      )}
      {/* Fallback link, in case the EmptyState action button isn't
          reachable for any reason (e.g. reduced-motion/no-JS edge
          case) - cheap to keep, costs nothing when unused. */}
      {state.status === 'error' && (
        <p className="text-center mt-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            לרשימת הקניות שלי
          </Link>
        </p>
      )}
    </div>
  );
}
