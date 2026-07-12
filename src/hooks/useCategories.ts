// src/hooks/useCategories.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';
import { useActiveList } from '../ActiveListContext';
import { useRealtimeTable } from './useRealtimeTable';
import { upsertById, removeById } from './realtimeUtils';

export interface Category {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
}

export function useCategories() {
  const { user } = useAuth();
  const { activeListId } = useActiveList();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!activeListId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('list_id', activeListId)
      .order('name', { ascending: true });

    if (!error && data) setCategories(data);
    setLoading(false);
  }, [activeListId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useRealtimeTable<Category>('categories', activeListId, {
    onInsert: (row) => setCategories((prev) => upsertById(prev, row)),
    onUpdate: (row) => setCategories((prev) => upsertById(prev, row)),
    onDelete: (id) => setCategories((prev) => removeById(prev, id)),
  });

  async function addCategory(name: string) {
    if (!name.trim() || !user || !activeListId) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticCategory: Category = {
      id: tempId,
      list_id: activeListId,
      user_id: user.id,
      name: name.trim(),
    };
    setCategories((prev) => [...prev, optimisticCategory]);

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), user_id: user.id, list_id: activeListId })
      .select()
      .single();

    if (error || !data) {
      setCategories((prev) => removeById(prev, tempId));
      return;
    }
    setCategories((prev) => upsertById(removeById(prev, tempId), data));
  }

  async function updateCategory(id: string, newName: string) {
    const previous = categories.find((c) => c.id === id);
    if (!previous) return;
    setCategories((prev) => upsertById(prev, { ...previous, name: newName }));

    const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);
    if (error) setCategories((prev) => upsertById(prev, previous));
  }

  async function deleteCategory(id: string) {
    const backup = categories;
    setCategories((prev) => removeById(prev, id));

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) setCategories(backup);
  }

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}
