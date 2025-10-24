import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


export default function ShoppingList() {
  const { language } = useLanguage();
  const t = shoppingLabels[language];
  const { user } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [input, setInput] = useState('');

const [categories, setCategories] = useState<any[]>([]);
const [selectedCategory, setSelectedCategory] = useState<string>('all');

useEffect(() => {
  if (!user) return;

  fetchCategories();
  fetchItems();
}, [user, selectedCategory]);

const fetchCategories = async () => {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user?.id)
    .order('name', { ascending: true });
  if (data) setCategories(data);
};

const fetchItems = async () => {
  let query = supabase
    .from('items')
    .select('*')
    .eq('user_id', user?.id)
    .order('position', { ascending: true });

  if (selectedCategory !== 'all') {
    query = query.eq('category_id', selectedCategory);
  }

  const { data, error } = await query;

  if (!error && data) setItems(data);
};

const renameItem = async (id: string, newName: string) => {
  const { error } = await supabase.from('items').update({ name: newName }).eq('id', id);
  if (!error) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: newName } : i)));
  }
};


  const addItem = async () => {
    if (!input.trim() || !user) return;
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        name: input,
        is_done: false,
        position: items.length,
        category_id: selectedCategory || null,
      })
      .select();

    if (!error && data) setItems((prev) => [...prev, ...data]);
    setInput('');
  };

  const toggleItem = async (item: any) => {
    const { data, error } = await supabase
      .from('items')
      .update({ is_done: !item.is_done })
      .eq('id', item.id)
      .select();

    if (!error && data) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i))
      );
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);

    setItems(newItems);

    for (let i = 0; i < newItems.length; i++) {
      if (newItems[i].position !== i) {
        await supabase.from('items').update({ position: i }).eq('id', newItems[i].id);
      }
    }
  };

  
const groupedItems = useMemo(() => {
  const groups: { [key: string]: any[] } = {};

  // יצירת קבוצות לפי category_id
  items.forEach((item) => {
    const catId = item.category_id || 'uncategorized';
    if (!groups[catId]) groups[catId] = [];
    groups[catId].push(item);
  });

  return groups;
}, [items]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 mt-6">
      <h1 className="text-2xl font-bold mb-4">{t.title}</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="flex-1 border p-2 rounded"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value="all">{t.allCategories}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

        <button
          onClick={addItem}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {t.add}
        </button>
        
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-sm font-semibold text-gray-700">{t.filterByCategory}</label>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-500">{t.empty}</p>
      ) : (

        Object.entries(groupedItems).map(([catId, itemsInCategory]) => {
        const category = categories.find((c) => c.id === catId);
        const categoryName = category?.name || (language === 'he' ? 'ללא קטגוריה' : 'Uncategorized');
        return (
            <div key={catId} className="mb-6">
            <h3 className="font-bold text-lg border-b mb-2 text-gray-800">
              {categoryName}
            </h3>
            <ul className="space-y-2">
              {itemsInCategory.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item)}
                  onDelete={() => deleteItem(item.id)}
                  onRename={renameItem}
                />
              ))}
            </ul>
            </div>
        );
        })
      )}
    </div>


  );
}

function SortableItem_old({ item, onToggle, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-grab"
    >
      <span
        onClick={onToggle}
        className={`cursor-pointer flex-1 ${item.is_done ? 'line-through text-gray-400' : ''}`}
      >
        {item.name}
      </span>
      <button onClick={onDelete} className="text-red-500 ml-2">
        🗑️
      </button>
    </li>
  );
}
function SortableItem_2({ item, onToggle, onDelete, onRename }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    onRename(item.id, name);
    setIsEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-grab"
    >
      {isEditing ? (
        <input
          className="flex-1 border px-2 py-1 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`cursor-pointer flex-1 ${item.is_done ? 'line-through text-gray-400' : ''}`}
        >
          {item.name}
        </span>
      )}
      <button onClick={onToggle} className="ml-2 text-green-600">✔️</button>
      <button onClick={onDelete} className="text-red-500 ml-2">🗑️</button>
    </li>
  );
}
function SortableItem({ item, onToggle, onDelete, onRename }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    onRename(item.id, name);
    setIsEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-grab"
    >
      {isEditing ? (
        <input
          className="flex-1 border px-2 py-1 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`cursor-pointer flex-1 ${item.is_done ? 'line-through text-gray-400' : ''}`}
        >
          {item.name}
        </span>
      )}
      <button onClick={onToggle} className="ml-2 text-green-600">✔️</button>
      <button onClick={onDelete} className="text-red-500 ml-2">🗑️</button>
    </li>
  );
}

