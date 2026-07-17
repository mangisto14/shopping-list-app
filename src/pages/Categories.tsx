// src/pages/CategoriesPage.tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveList } from '../ActiveListContext';
import { useCategories, type Category } from '../hooks/useCategories';
import { useItems } from '../hooks/useItems';
import { useLanguage } from '../LanguageContext';
import CategoryCard from '../components/categories/CategoryCard';
import CategoryAddTile from '../components/categories/CategoryAddTile';
import CategorySheet from '../components/categories/CategorySheet';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';

export default function CategoriesPage() {
  const { language } = useLanguage();
  const { activeListId, loading: listsLoading } = useActiveList();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { items } = useItems();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const activeItemCount = items.filter((i) => !i.is_done).length;

  const itemCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (!item.category_id) return;
      counts[item.category_id] = (counts[item.category_id] ?? 0) + 1;
    });
    return counts;
  }, [items]);

  const openCreateSheet = () => {
    setEditingCategory(null);
    setSheetOpen(true);
  };

  const openEditSheet = (category: Category) => {
    setEditingCategory(category);
    setSheetOpen(true);
  };

  const handleSave = (name: string) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, name);
    } else {
      addCategory(name);
    }
  };

  if (listsLoading) {
    return <PageSkeleton />;
  }

  if (!activeListId) {
    return (
      <div className="max-w-md mx-auto p-4 text-center text-gray-500">
        <Link to="/lists" className="text-blue-600 hover:underline">
          {language === 'he' ? 'צור/י רשימה כדי להתחיל' : 'Create a list to get started'}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-28 space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">קטגוריות</h1>
          <p className="text-[13px] font-medium text-gray-500">
            {categories.length} קטגוריות · {activeItemCount} פריטים פעילים
          </p>
        </div>
        <button
          onClick={openCreateSheet}
          className="flex-shrink-0 h-10 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center gap-1.5 px-4 shadow-[0_6px_14px_rgba(37,99,235,0.35)]"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span>חדשה</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title={language === 'he' ? 'אין עדיין קטגוריות' : 'No categories yet'}
          description={language === 'he' ? 'הוסף/י קטגוריה ראשונה' : 'Add your first category above'}
          actionLabel={language === 'he' ? 'קטגוריה חדשה' : 'New category'}
          onAction={openCreateSheet}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              itemCount={itemCountByCategory[cat.id] ?? 0}
              onClick={() => openEditSheet(cat)}
            />
          ))}
          <CategoryAddTile label="יצירת קטגוריה חדשה" onClick={openCreateSheet} />
        </div>
      )}

      <CategorySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        category={editingCategory}
        onSave={handleSave}
        onDelete={deleteCategory}
      />
    </div>
  );
}
