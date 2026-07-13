// src/components/lists/ListSelectorModal.tsx
import { useEffect, useState } from 'react';
import type { ListInfo } from './ListCard';
import ListCard from './ListCard';

interface ListSelectorModalProps {
  open: boolean;
  onClose: () => void;
  lists: ListInfo[];
  activeListId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export default function ListSelectorModal({
  open,
  onClose,
  lists,
  activeListId,
  onSelect,
  onCreateNew,
}: ListSelectorModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md max-h-[80vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-md flex flex-col transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">הרשימות שלי</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} active={list.id === activeListId} onClick={() => onSelect(list.id)} />
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-[0.99]"
          >
            <span>➕</span>
            צור רשימה חדשה
          </button>
        </div>
      </div>
    </div>
  );
}
