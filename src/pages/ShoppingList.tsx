import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useItems, type Item } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import ShoppingHeader from '../components/shopping/ShoppingHeader';
import ProgressBar from '../components/shopping/ProgressBar';
import ActivityFeed from '../components/shopping/ActivityFeed';
import CategorySection, { getCategoryStyle } from '../components/shopping/CategorySection';
import FloatingAddButton from '../components/shopping/FloatingAddButton';

export default function ShoppingList() {
  const { language } = useLanguage();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { activeListId, loading: listsLoading } = useActiveList();

  const { items, addItem: addItemToList, toggleItem, renameItem, deleteItem } = useItems();
  const { categories } = useCategories();

  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const addItem = async () => {
    if (!input.trim()) return;
    // Preserving the existing `selectedCategory || null` expression as-is:
    // since selectedCategory defaults to the truthy string 'all', this
    // never actually evaluates to null while the "all" filter is active.
    // Pre-existing behavior, not a regression introduced here - not in
    // scope for a UI-only refactor to change.
    await addItemToList(input, selectedCategory || null);
    setInput('');
    setShowAddForm(false);
  };

  const visibleItems = useMemo(
    () => (selectedCategory === 'all' ? items : items.filter((i) => i.category_id === selectedCategory)),
    [items, selectedCategory]
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};

    // יצירת קבוצות לפי category_id
    visibleItems.forEach((item) => {
      const catId = item.category_id || 'uncategorized';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(item);
    });

    return groups;
  }, [visibleItems]);

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.is_done).length;

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
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-28 space-y-4">
      <ShoppingHeader
        title={t.familyTitle}
        subtitle={t.subtitle}
        totalItems={totalItems}
        completedItems={completedItems}
        itemsLabel={t.itemsCount}
        completedLabel={t.completedCount}
      />

      <ProgressBar totalItems={totalItems} completedItems={completedItems} label={t.progressLabel} />

      <ActivityFeed />

      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 px-1">{t.filterByCategory}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t.allCategories}
            </button>
            {categories.map((cat) => {
              const style = getCategoryStyle(cat.name);
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all border flex items-center gap-1 ${
                    active
                      ? `${style.fill} text-white border-transparent`
                      : `bg-white ${style.text} border-gray-200 hover:border-gray-300`
                  }`}
                >
                  <span>{style.icon}</span>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🛒</p>
          <p>{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedItems).map(([catId, itemsInCategory]) => {
            const category = categories.find((c) => c.id === catId) ?? null;
            return (
              <CategorySection
                key={catId}
                category={category}
                items={itemsInCategory}
                uncategorizedLabel={t.uncategorized}
                onToggle={toggleItem}
                onDelete={deleteItem}
                onRename={renameItem}
              />
            );
          })}
        </div>
      )}

      {showAddForm && (
        <div className="fixed bottom-24 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-80 z-40 bg-white rounded-xl shadow-lg p-3 space-y-2">
          <input
            type="text"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={t.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600 transition-all"
            >
              {t.add}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <FloatingAddButton onClick={() => setShowAddForm((v) => !v)} />
    </div>
  );
}
