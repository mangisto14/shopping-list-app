// src/hooks/useCategories.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';
import { useActiveList } from '../ActiveListContext';
import { useRealtimeTable } from './useRealtimeTable';
import { upsertById, removeById } from './realtimeUtils';
import { useForceSyncListener } from '../devtools';
import { findMatchingCategory } from '../utils/categoryMatching';

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

  useForceSyncListener(fetchCategories);

  useRealtimeTable<Category>('categories', activeListId, {
    onInsert: (row) => setCategories((prev) => upsertById(prev, row)),
    onUpdate: (row) => setCategories((prev) => upsertById(prev, row)),
    onDelete: (id) => setCategories((prev) => removeById(prev, id)),
  });

  // Returns the created category (or the pre-existing one, if this name
  // already matches - case/whitespace-insensitively - a category on
  // this list), so a caller that needs to immediately select whatever
  // this resolved to (e.g. Smart Import's "+ Create category" action)
  // can do so without a second lookup. Returns null only when nothing
  // was created and nothing existing matched (blank name, or not
  // logged in/no active list).
  async function addCategory(name: string): Promise<Category | null> {
    const trimmed = name.trim();
    if (!trimmed || !user || !activeListId) return null;

    const existing = findMatchingCategory(categories, trimmed);
    if (existing) return existing;

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticCategory: Category = {
      id: tempId,
      list_id: activeListId,
      user_id: user.id,
      name: trimmed,
    };
    setCategories((prev) => [...prev, optimisticCategory]);

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: trimmed, user_id: user.id, list_id: activeListId })
      .select()
      .single();

    if (error || !data) {
      setCategories((prev) => removeById(prev, tempId));
      return null;
    }
    setCategories((prev) => upsertById(removeById(prev, tempId), data));
    return data;
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
