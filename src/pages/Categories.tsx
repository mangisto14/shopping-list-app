// src/pages/CategoriesPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveList } from '../ActiveListContext';
import { useCategories } from '../hooks/useCategories';
import { useLanguage } from '../LanguageContext';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';

export default function CategoriesPage() {
  const { language } = useLanguage();
  const { activeListId, loading: listsLoading } = useActiveList();
  const { categories, addCategory: addCategoryToList, updateCategory, deleteCategory } = useCategories();
  const [input, setInput] = useState('');

  const addCategory = async () => {
    if (!input.trim()) return;
    await addCategoryToList(input);
    setInput('');
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
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">קטגוריות</h2>

      <div className="flex mb-4 gap-2">
        <label htmlFor="new-category-input" className="sr-only">
          {language === 'he' ? 'שם קטגוריה חדשה' : 'New category name'}
        </label>
        <input
          id="new-category-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          placeholder="הוסף קטגוריה"
          className="border p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addCategory}
          className="bg-blue-500 text-white px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          הוסף
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title={language === 'he' ? 'אין עדיין קטגוריות' : 'No categories yet'}
          description={language === 'he' ? 'הוסף/י קטגוריה ראשונה למעלה' : 'Add your first category above'}
        />
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
              <label htmlFor={`category-${cat.id}`} className="sr-only">
                {language === 'he' ? 'שם קטגוריה' : 'Category name'}
              </label>
              <input
                id={`category-${cat.id}`}
                defaultValue={cat.name}
                onBlur={(e) => updateCategory(cat.id, e.target.value)}
                className="flex-1 bg-transparent border-b focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => deleteCategory(cat.id)}
                aria-label={language === 'he' ? 'מחק קטגוריה' : 'Delete category'}
                className="text-red-500 ml-2 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
