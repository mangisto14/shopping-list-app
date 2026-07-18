// src/hooks/useLists.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export interface ShoppingListSummary {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  archived: boolean;
  member_count: number;
  item_count: number;
}

export function useLists() {
  // `authLoading` matters here, not just `user`: useAuth() starts every
  // mount with `user === null` for the brief window before its own
  // getSession() call resolves, indistinguishable from "confirmed
  // logged out" if only `user` is checked. Without waiting for
  // authLoading to clear, this hook would report "loading: false,
  // lists: []" during that transient window on every page load -
  // exactly the shape ActiveListContext otherwise (correctly) treats
  // as "confirmed zero lists," wiping a valid persisted active list
  // before auth has even resolved once.
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<ShoppingListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinguishes "we asked and there are genuinely zero lists" from
  // "the fetch itself failed, we don't actually know" - callers (in
  // particular ActiveListContext) must not treat these the same way.
  // A failed fetch leaves `lists` at whatever it was before (this
  // function never clears it on error), but that alone isn't visible
  // to a caller that only looks at `lists.length === 0`.
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // items(count) mirrors the existing list_members(count) embed - a
    // purely additive read, not a change to any CRUD operation. Lets
    // the list switcher show real per-list item counts instead of a
    // guess, without adding a new query anywhere.
    const { data, error: fetchError } = await supabase
      .from('lists')
      .select('id, name, owner_id, created_at, archived, list_members(count), items(count)')
      .order('created_at', { ascending: true });

    if (fetchError || !data) {
      console.error('useLists: failed to fetch lists', fetchError);
      setError(fetchError?.message ?? 'unknown_error');
      setLoading(false);
      return;
    }

    setError(null);
    setLists(
      data.map((row: any) => ({
        id: row.id,
        name: row.name,
        owner_id: row.owner_id,
        created_at: row.created_at,
        archived: row.archived ?? false,
        member_count: row.list_members?.[0]?.count ?? 0,
        item_count: row.items?.[0]?.count ?? 0,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLists([]);
      setError(null);
      setLoading(false);
      return;
    }
    fetchLists();
  }, [user, authLoading, fetchLists]);

  async function createList(name: string) {
    if (!user || !name.trim()) return null;

    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert({ name: name.trim(), owner_id: user.id })
      .select()
      .single();

    if (listError || !list) return null;

    const { error: memberError } = await supabase
      .from('list_members')
      .insert({ list_id: list.id, user_id: user.id });

    if (memberError) return null;

    await fetchLists();
    return list;
  }

  // Rename/delete/archive all use RLS policies that already exist
  // (lists_update_owner_only, lists_delete_owner_only) - no schema or
  // policy change needed beyond the `archived` column itself. Each
  // applies an optimistic local update first, same pattern as
  // createList/addItem elsewhere in this app, and rolls back on error.
  async function updateListName(id: string, name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const previous = lists.find((l) => l.id === id);
    if (!previous) return false;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l)));

    const { error } = await supabase.from('lists').update({ name: trimmed }).eq('id', id);
    if (error) {
      setLists((prev) => prev.map((l) => (l.id === id ? previous : l)));
      return false;
    }
    return true;
  }

  async function setListArchived(id: string, archived: boolean): Promise<boolean> {
    const previous = lists.find((l) => l.id === id);
    if (!previous) return false;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, archived } : l)));

    const { error } = await supabase.from('lists').update({ archived }).eq('id', id);
    if (error) {
      setLists((prev) => prev.map((l) => (l.id === id ? previous : l)));
      return false;
    }
    return true;
  }

  async function deleteList(id: string): Promise<boolean> {
    const backup = lists;
    setLists((prev) => prev.filter((l) => l.id !== id));

    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (error) {
      setLists(backup);
      return false;
    }
    return true;
  }

  return { lists, loading, error, createList, updateListName, setListArchived, deleteList, refetch: fetchLists };
}
