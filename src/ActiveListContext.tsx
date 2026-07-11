// ActiveListContext.tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLists, type ShoppingListSummary } from './hooks/useLists';

const STORAGE_KEY = 'shopping-list:activeListId';

interface ActiveListContextValue {
  lists: ShoppingListSummary[];
  loading: boolean;
  activeListId: string | null;
  activeList: ShoppingListSummary | null;
  setActiveListId: (id: string) => void;
  createList: (name: string) => Promise<ShoppingListSummary | null>;
  refetchLists: () => Promise<void>;
}

const ActiveListContext = createContext<ActiveListContextValue | undefined>(undefined);

export function ActiveListProvider({ children }: { children: ReactNode }) {
  const { lists, loading, createList, refetch } = useLists();
  const [activeListId, setActiveListIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  useEffect(() => {
    if (loading) return;

    const storedIsValid = lists.some((l) => l.id === activeListId);
    if (!storedIsValid) {
      const fallback = lists[0]?.id ?? null;
      setActiveListIdState(fallback);
      if (fallback) localStorage.setItem(STORAGE_KEY, fallback);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, [loading, lists, activeListId]);

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
      value={{ lists, loading, activeListId, activeList, setActiveListId, createList, refetchLists: refetch }}
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
