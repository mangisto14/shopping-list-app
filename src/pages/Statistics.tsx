// src/pages/Statistics.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveList } from '../ActiveListContext';
import { useItems } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import { getCategoryStyle } from '../components/shopping/CategorySection';
import EmptyListsState from '../components/lists/EmptyListsState';
import AppCard from '../components/ui/AppCard';
import SectionHeader from '../components/ui/SectionHeader';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';

// Deliberately no trend/history charts here: the `items` table has no
// timestamp field, and the only table that does (`history`) has no
// write path anywhere in the current codebase (checked - nothing
// inserts into it), so any "over time" chart would have to be
// fabricated. Every number on this page is derived from the current,
// real items/categories state.
export default function Statistics() {
  const navigate = useNavigate();
  const { activeList, loading: listsLoading } = useActiveList();
  const { items } = useItems();
  const { categories } = useCategories();

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.is_done).length;
  const remainingItems = totalItems - completedItems;
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const categoryStats = useMemo(
    () =>
      categories
        .map((cat) => {
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
        })
        .filter((c) => c.total > 0),
    [categories, items]
  );

  if (listsLoading) {
    return <PageSkeleton />;
  }

  if (!activeList) {
    return (
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <EmptyListsState onCreateFirst={() => navigate('/lists')} />
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-10 space-y-4">
      <h1 className="text-lg font-bold text-gray-800 px-1">סטטיסטיקה</h1>

      <div className="grid grid-cols-3 gap-3">
        <AppCard className="text-center">
          <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          <p className="text-xs text-gray-500 mt-1">סה״כ פריטים</p>
        </AppCard>
        <AppCard className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{completedItems}</p>
          <p className="text-xs text-gray-500 mt-1">נקנו</p>
        </AppCard>
        <AppCard className="text-center">
          <p className="text-2xl font-bold text-violet-600">{remainingItems}</p>
          <p className="text-xs text-gray-500 mt-1">נותרו</p>
        </AppCard>
      </div>

      <AppCard>
        <ProgressBar percentage={percentage} label="אחוז השלמה כולל" />
      </AppCard>

      <div>
        <SectionHeader title="פילוח לפי קטגוריה" />
        {categoryStats.length === 0 ? (
          <EmptyState icon="📊" title="אין נתונים להצגה" />
        ) : (
          <div className="space-y-2">
            {categoryStats.map((cat) => (
              <AppCard key={cat.id}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm min-w-0 truncate">
                    <span className="text-lg flex-shrink-0">{cat.style.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className={`flex-shrink-0 text-xs font-bold ${cat.style.text}`}>
                    {cat.done}/{cat.total}
                  </span>
                </div>
                <ProgressBar percentage={cat.percentage} height="sm" colorClassName={cat.style.fill} />
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
