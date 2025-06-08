import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function CategoryManager({ onCategoriesChange }: { onCategoriesChange: (cats: any[]) => void }) {
  const { user } = useAuth();
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
      onCategoriesChange(data); // מעדכן את קומפוננט האם
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCategory, user_id: user.id })
      .select();

    if (!error && data) {
      const updated = [...categories, ...data];
      setCategories(updated);
      onCategoriesChange(updated);
      setNewCategory('');
    }
  };

  return (
    <div className="my-4">
      <h2 className="font-bold mb-2">קטגוריות</h2>
      <div className="flex gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="שם קטגוריה חדשה"
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={addCategory}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          הוסף
        </button>
      </div>
      {categories.length > 0 && (
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          {categories.map((cat) => (
            <li key={cat.id}>• {cat.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
