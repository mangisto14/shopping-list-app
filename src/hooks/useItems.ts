// src/hooks/useItems.ts
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export interface Item {
  id: string;
  name: string;
  is_done: boolean;
  position: number;
  category_id: string | null;
}

export function useItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user?.id)
      .order('position', { ascending: true });

    if (!error && data) setItems(data);
    setLoading(false);
  }

  async function addItem(name: string) {
    const position = items.length > 0 ? items[items.length - 1].position + 1 : 0;
    const { data, error } = await supabase
      .from('items')
      .insert([{ name, user_id: user?.id, position }])
      .select()
      .single();

    if (!error && data) setItems((prev) => [...prev, data]);
  }

  async function updateItem(id: string, updates: Partial<Item>) {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
    }
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function reorderItems(updated: Item[]) {
    setItems(updated);
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      await supabase.from('items').update({ position: i }).eq('id', item.id);
    }
  }

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  };
}
