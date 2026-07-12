import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useItems } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


export default function ShoppingList() {
  const { language } = useLanguage();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { activeListId, loading: listsLoading } = useActiveList();

  const { items, addItem: addItemToList, toggleItem, renameItem, deleteItem } = useItems();
  const { categories } = useCategories();

  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const addItem = async () => {
    if (!input.trim()) return;
    await addItemToList(input, selectedCategory || null);
    setInput('');
  };

const visibleItems = useMemo(
  () => (selectedCategory === 'all' ? items : items.filter((i) => i.category_id === selectedCategory)),
  [items, selectedCategory]
);

const groupedItems = useMemo(() => {
  const groups: { [key: string]: any[] } = {};

  // יצירת קבוצות לפי category_id
  visibleItems.forEach((item) => {
    const catId = item.category_id || 'uncategorized';
    if (!groups[catId]) groups[catId] = [];
    groups[catId].push(item);
  });

  return groups;
}, [visibleItems]);

  if (!listsLoading && !activeListId) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 mt-6 text-center text-gray-500">
        <Link to="/lists" className="text-blue-600 hover:underline">
          {language === 'he' ? 'צור/י רשימה כדי להתחיל' : 'Create a list to get started'}
        </Link>
      </div>
    );
  }

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
        <label className="text-sm font-semibold text-gray-700">{(t as any).filterByCategory}</label>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-center text-gray-500">{(t as any).empty}</p>
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

