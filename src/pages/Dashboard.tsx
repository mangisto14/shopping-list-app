// src/pages/Dashboard.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useItems } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import { getCategoryStyle } from '../components/shopping/CategorySection';
import EmptyListsState from '../components/lists/EmptyListsState';

export default function Dashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { activeList, loading: listsLoading } = useActiveList();
  const { items } = useItems();
  const { categories } = useCategories();

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.is_done).length;
  const remainingItems = totalItems - completedItems;
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Derived purely from the existing items/categories state - same
  // per-category done/total computation CategorySection already does
  // per-render, just aggregated here instead of rendered as item rows.
  const categoryStats = useMemo(
    () =>
      categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        const done = catItems.filter((i) => i.is_done).length;
        return {
          id: cat.id,
          name: cat.name,
          total: catItems.length,
          done,
          percentage: catItems.length > 0 ? Math.round((done / catItems.length) * 100) : 0,
          style: getCategoryStyle(cat.name),
        };
      }),
    [categories, items]
  );

  const stillToBuy = useMemo(() => items.filter((i) => !i.is_done), [items]);

  if (!listsLoading && !activeList) {
    return (
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <EmptyListsState onCreateFirst={() => navigate('/lists')} />
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-10 space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h1 className="text-lg font-bold text-gray-800 truncate">
          {activeList ? activeList.name : t.familyTitle}
        </h1>
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap text-sm text-gray-500">
          <span>
            <span className="font-semibold text-gray-700">{totalItems}</span> {t.itemsCount}
            {'  •  '}
            <span className="font-semibold text-gray-700">{completedItems}</span> {t.completedCount}
          </span>
          <span className="font-semibold text-violet-600">
            {percentage}% {t.progressLabel}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {remainingItems} {t.remainingLabel}
        </p>
      </div>

      {categoryStats.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-2 px-1">קטגוריות</h2>
          <div className="grid grid-cols-2 gap-3">
            {categoryStats.map((cat) => (
              <div key={cat.id} className={`rounded-2xl p-4 ${cat.style.bg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${cat.style.text}`}>{cat.percentage}%</span>
                  <span className="text-2xl">{cat.style.icon}</span>
                </div>
                <p className="font-bold text-gray-800 mt-3 text-sm truncate">{cat.name}</p>
                <p className={`text-xs font-medium mt-0.5 ${cat.style.text}`}>
                  {cat.done}/{cat.total} {t.completedCount}
                </p>
                <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${cat.style.fill}`} style={{ width: `${cat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold text-gray-800 mb-2 px-1">עוד לקנות</h2>
        {stillToBuy.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">🎉 הכל נקנה</div>
        ) : (
          <div className="space-y-2">
            {stillToBuy.map((item) => {
              const category = categories.find((c) => c.id === item.category_id) ?? null;
              const style = getCategoryStyle(category?.name);
              return (
                <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3">
                  <span className="text-lg flex-shrink-0">{style.icon}</span>
                  <p className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-800">{item.name}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
