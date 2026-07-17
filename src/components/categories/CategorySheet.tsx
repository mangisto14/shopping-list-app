// src/components/categories/CategorySheet.tsx
import { useEffect, useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import type { Category } from '../../hooks/useCategories';

interface CategorySheetProps {
  open: boolean;
  onClose: () => void;
  category: Category | null; // null = create mode
  onSave: (name: string) => void;
  onDelete?: (id: string) => void;
}

// Single sheet for both creating a new category and renaming/deleting
// an existing one - the Claude Design shows category CRUD living behind
// a tap on a card/tile rather than the old page's always-visible
// inline `<input>` row. Wraps the same addCategory/updateCategory/
// deleteCategory calls the page already had.
export default function CategorySheet({ open, onClose, category, onSave, onDelete }: CategorySheetProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(category?.name ?? '');
  }, [open, category]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={category ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}>
      <input
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="שם הקטגוריה"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold shadow-[0_6px_14px_rgba(37,99,235,0.35)] hover:shadow-md active:scale-[0.99] transition-all"
      >
        שמירה
      </button>

      {category && onDelete && (
        <button
          onClick={() => {
            onDelete(category.id);
            onClose();
          }}
          className="w-full bg-red-50 text-red-500 rounded-xl py-3 text-sm font-semibold hover:bg-red-100 transition-all"
        >
          מחיקת קטגוריה
        </button>
      )}
    </BottomSheet>
  );
}
