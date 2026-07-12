// src/hooks/useItems.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';
import { useActiveList } from '../ActiveListContext';
import { useRealtimeTable } from './useRealtimeTable';
import { upsertById, removeById } from './realtimeUtils';

export interface Item {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  is_done: boolean;
  position: number;
  category_id: string | null;
}

export function useItems() {
  const { user } = useAuth();
  const { activeListId } = useActiveList();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!activeListId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('list_id', activeListId)
      .order('position', { ascending: true });

    if (!error && data) setItems(data);
    setLoading(false);
  }, [activeListId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useRealtimeTable<Item>('items', activeListId, {
    onInsert: (row) => setItems((prev) => upsertById(prev, row)),
    onUpdate: (row) => setItems((prev) => upsertById(prev, row)),
    onDelete: (id) => setItems((prev) => removeById(prev, id)),
  });

  async function addItem(name: string, categoryId: string | null) {
    if (!name.trim() || !user || !activeListId) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticItem: Item = {
      id: tempId,
      list_id: activeListId,
      user_id: user.id,
      name,
      is_done: false,
      position: items.length,
      category_id: categoryId,
    };
    setItems((prev) => [...prev, optimisticItem]);

    const { data, error } = await supabase
      .from('items')
      .insert({
        list_id: activeListId,
        user_id: user.id,
        name,
        is_done: false,
        position: items.length,
        category_id: categoryId,
      })
      .select()
      .single();

    if (error || !data) {
      setItems((prev) => removeById(prev, tempId));
      return;
    }
    // Replace the temp row with the real one. If the realtime echo of
    // this same insert has already arrived first, upsertById just
    // overwrites it in place - no duplicate either way.
    setItems((prev) => upsertById(removeById(prev, tempId), data));
  }

  async function toggleItem(item: Item) {
    const nextDone = !item.is_done;
    setItems((prev) => upsertById(prev, { ...item, is_done: nextDone }));

    const { error } = await supabase.from('items').update({ is_done: nextDone }).eq('id', item.id);
    if (error) setItems((prev) => upsertById(prev, item));
  }

  async function renameItem(id: string, newName: string) {
    const previous = items.find((i) => i.id === id);
    if (!previous) return;
    setItems((prev) => upsertById(prev, { ...previous, name: newName }));

    const { error } = await supabase.from('items').update({ name: newName }).eq('id', id);
    if (error) setItems((prev) => upsertById(prev, previous));
  }

  async function deleteItem(id: string) {
    const backup = items;
    setItems((prev) => removeById(prev, id));

    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) setItems(backup);
  }

  return { items, loading, addItem, toggleItem, renameItem, deleteItem };
}
