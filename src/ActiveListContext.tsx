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
  updateListName: (id: string, name: string) => Promise<boolean>;
  setListArchived: (id: string, archived: boolean) => Promise<boolean>;
  deleteList: (id: string) => Promise<boolean>;
  refetchLists: () => Promise<void>;
}

const ActiveListContext = createContext<ActiveListContextValue | undefined>(undefined);

export function ActiveListProvider({ children }: { children: ReactNode }) {
  const { lists, loading, createList, updateListName, setListArchived, deleteList, refetch } = useLists();
  const [activeListId, setActiveListIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  useEffect(() => {
    if (loading) return;

    // An archived list can't be "active" - if the stored id belongs to
    // a list that's since been archived or deleted, fall back to the
    // first non-archived list instead.
    const storedIsValid = lists.some((l) => l.id === activeListId && !l.archived);
    if (!storedIsValid) {
      const fallback = lists.find((l) => !l.archived)?.id ?? null;
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
      value={{
        lists,
        loading,
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
