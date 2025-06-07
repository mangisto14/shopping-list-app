import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user?.id)
      .order('position', { ascending: true });

    if (!error && data) setItems(data);
  };

  const addItem = async () => {
    if (!input.trim() || !user) return;
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        name: input,
        is_done: false,
        position: items.length
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
        <button
          onClick={addItem}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {t.add}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-500">{t.empty}</p>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableItem({ item, onToggle, onDelete }: any) {
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
