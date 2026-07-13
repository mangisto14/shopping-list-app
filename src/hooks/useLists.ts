// src/hooks/useLists.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export interface ShoppingListSummary {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  member_count: number;
  item_count: number;
}

export function useLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<ShoppingListSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // items(count) mirrors the existing list_members(count) embed - a
    // purely additive read, not a change to any CRUD operation. Lets
    // the list switcher show real per-list item counts instead of a
    // guess, without adding a new query anywhere.
    const { data, error } = await supabase
      .from('lists')
      .select('id, name, owner_id, created_at, list_members(count), items(count)')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setLists(
        data.map((row: any) => ({
          id: row.id,
          name: row.name,
          owner_id: row.owner_id,
          created_at: row.created_at,
          member_count: row.list_members?.[0]?.count ?? 0,
          item_count: row.items?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }
    fetchLists();
  }, [user, fetchLists]);

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

  return { lists, loading, createList, refetch: fetchLists };
}
