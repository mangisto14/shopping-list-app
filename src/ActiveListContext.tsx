// ActiveListContext.tsx
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLists, type ShoppingListSummary } from './hooks/useLists';
// TEMP DEBUG - not committed. resolveJsonModule is already on in
// tsconfig.json, so this is a plain, safe, read-only JSON import - not
// a business-logic dependency, just a source for the report's
// "App Version" field.
import pkg from '../package.json';

const STORAGE_KEY = 'shopping-list:activeListId';

// TEMP DEBUG - not committed. Builds the single consolidated report
// requested in place of scattered console.log calls. Returns the
// formatted text so it can both be logged (inside one collapsed
// console group) and copied verbatim via the dev-panel button.
function buildDebugReportText(snapshot: any, activeListId: string | null): string {
  const bar = '='.repeat(30);
  return [
    bar,
    'LISTS FETCH FAILURE',
    bar,
    '',
    `Timestamp: ${snapshot.timestamp}`,
    `Current Route: ${window.location.pathname}`,
    `Authenticated User: ${snapshot.userId ?? '(none)'}`,
    `Active List Id: ${activeListId ?? '(none)'}`,
    `Supabase URL: ${snapshot.supabaseUrl ?? '(none)'}`,
    '',
    'Request:',
    `- Table: ${snapshot.table}`,
    `- Select: ${snapshot.select}`,
    `- Filters: ${snapshot.filters}`,
    '',
    'Response:',
    `- HTTP Status: ${snapshot.status ?? '(none)'}`,
    `- Status Text: ${snapshot.statusText ?? '(none)'}`,
    '',
    'Supabase Error:',
    `- Code: ${snapshot.error?.code ?? '(none)'}`,
    `- Message: ${snapshot.error?.message ?? '(none)'}`,
    `- Details: ${snapshot.error?.details ?? '(none)'}`,
    `- Hint: ${snapshot.error?.hint ?? '(none)'}`,
    '',
    'Raw Response:',
    JSON.stringify(snapshot.rawResponse, null, 2),
    '',
    'Environment:',
    `- Mode: ${import.meta.env.DEV ? 'DEV' : 'PROD'}`,
    `- Browser: ${navigator.userAgent}`,
    `- App Version: ${pkg.version}`,
    '',
    bar,
  ].join('\n');
}
// END TEMP DEBUG

interface ActiveListContextValue {
  lists: ShoppingListSummary[];
  loading: boolean;
  error: string | null;
  debugReportText?: string | null; // TEMP DEBUG - not committed
  activeListId: string | null;
  activeList: ShoppingListSummary | null;
  setActiveListId: (id: string) => void;
  createList: (name: string) => Promise<ShoppingListSummary | null>;
  updateListName: (id: string, name: string) => Promise<boolean>;
  setListArchived: (id: string, archived: boolean) => Promise<boolean>;
  deleteList: (id: string) => Promise<boolean>;
  refetchLists: () => Promise<void>;
}

const ActiveListContext = createContext<ActiveListContextValue | undefined>(undefined);

export function ActiveListProvider({ children }: { children: ReactNode }) {
  const { lists, loading, error, debugSnapshot, createList, updateListName, setListArchived, deleteList, refetch } = useLists();
  const [activeListId, setActiveListIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  // TEMP DEBUG - not committed
  const [debugReportText, setDebugReportText] = useState<string | null>(null);
  const lastReportedSnapshot = useRef<any>(null);

  // TEMP DEBUG - not committed. Fires only when the lists request
  // actually fails (a real snapshot with a populated `.error`), not on
  // every render - prints exactly one collapsed console group per
  // failed fetch instead of scattered console.log calls.
  useEffect(() => {
    if (!debugSnapshot?.error) return;
    if (lastReportedSnapshot.current === debugSnapshot) return; // already printed this exact snapshot
    lastReportedSnapshot.current = debugSnapshot;

    const reportText = buildDebugReportText(debugSnapshot, activeListId);
    setDebugReportText(reportText);

    console.groupCollapsed('%cLISTS FETCH FAILURE', 'color:#dc2626;font-weight:bold;');
    console.log(reportText);
    console.groupEnd();
  }, [debugSnapshot, activeListId]);
  // END TEMP DEBUG

  useEffect(() => {
    if (loading) return;
    // If the fetch itself failed, we do not actually know the real
    // list state - `lists` here could just be stale/empty because the
    // request errored, not because the user genuinely has zero lists.
    // Leave activeListId (and its localStorage entry) exactly as they
    // were rather than treating "fetch failed" the same as "confirmed
    // zero/invalid lists" - this is what previously wiped a perfectly
    // valid persisted selection during an unrelated fetch failure.
    if (error) return;

    // An archived list can't be "active" - if the stored id belongs to
    // a list that's since been archived or deleted, fall back to the
    // first non-archived list instead. This only runs once we know
    // `lists` reflects a real, successful fetch.
    const storedIsValid = lists.some((l) => l.id === activeListId && !l.archived);
    if (!storedIsValid) {
      const fallback = lists.find((l) => !l.archived)?.id ?? null;
      setActiveListIdState(fallback);
      if (fallback) localStorage.setItem(STORAGE_KEY, fallback);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, [loading, error, lists, activeListId]);

  const setActiveListId = (id: string) => {
    setActiveListIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? null,
    [lists, activeListId]
  );

  return (
    <ActiveListContext.Provider
      value={{
        lists,
        loading,
        error,
        debugReportText,
        activeListId,
        activeList,
        setActiveListId,
        createList,
        updateListName,
        setListArchived,
        deleteList,
        refetchLists: refetch,
      }}
    >
      {children}
    </ActiveListContext.Provider>
  );
}

export function useActiveList() {
  const ctx = useContext(ActiveListContext);
  if (!ctx) throw new Error('useActiveList must be used within an ActiveListProvider');
  return ctx;
}
