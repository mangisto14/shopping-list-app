// src/pages/CategoriesPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (user) fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('name', { ascending: true });
    setCategories(data || []);
  };

  const addCategory = async () => {
    if (!input.trim()) return;
    const { data } = await supabase
      .from('categories')
      .insert({ name: input.trim(), user_id: user?.id })
      .select();
    if (data) setCategories((prev) => [...prev, ...data]);
    setInput('');
  };

  const updateCategory = async (id: string, newName: string) => {
    const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);
    if (!error) fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">קטגוריות</h2>

      <div className="flex mb-4 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="הוסף קטגוריה"
          className="border p-2 rounded flex-1"
        />
        <button onClick={addCategory} className="bg-blue-500 text-white px-4 rounded">
          הוסף
        </button>
      </div>

      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
            <input
              defaultValue={cat.name}
              onBlur={(e) => updateCategory(cat.id, e.target.value)}
              className="flex-1 bg-transparent border-b focus:outline-none"
            />
            <button onClick={() => deleteCategory(cat.id)} className="text-red-500 ml-2">🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
