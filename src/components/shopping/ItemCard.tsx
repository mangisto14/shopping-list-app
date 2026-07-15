// src/components/shopping/ItemCard.tsx
import { useState } from 'react';
import type { Item } from '../../hooks/useItems';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ItemCardProps {
  item: Item;
  categoryName?: string;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (id: string, newName: string) => void;
}

export default function ItemCard({ item, categoryName, onToggle, onDelete, onRename }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const style = getCategoryStyle(categoryName);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== item.name) {
      onRename(item.id, trimmed);
    } else {
      setName(item.name);
    }
    setIsEditing(false);
  };

  return (
    <li
      className={`flex items-center gap-3 bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.05)] px-3.5 py-3 transition-all hover:shadow-md ${
        item.is_done ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={onToggle}
        aria-label="toggle item"
        className={`flex-shrink-0 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center transition-all ${
          item.is_done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'
        }`}
      >
        {item.is_done && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
            <path d="M1.5 5.5L4.5 8.5L10.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border-b border-blue-400 bg-transparent focus:outline-none text-[16.5px] font-semibold"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={`w-full text-right truncate text-[16.5px] font-semibold ${
              item.is_done ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {item.name}
          </button>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {categoryName && (
            <span className={`text-[11.5px] font-bold ${style.bg} ${style.text} rounded-full px-2.5 py-0.5`}>
              {categoryName}
            </span>
          )}
          {/* TODO: replace with real attribution once item rows carry a
              joinable profile (display name/avatar). There is no
              profiles table yet - same limitation already flagged on the
              Lists page's member panel. Placeholder only, not wired to
              item.user_id. */}
          <span className="text-[13px] font-medium text-gray-500">נוסף ע״י חבר</span>
        </div>
      </div>

      <button
        onClick={onDelete}
        aria-label="delete item"
        className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors px-1 text-sm"
      >
        🗑️
      </button>

      {/* Decorative only - matches the design's swipe-affordance chevron.
          No swipe gesture is wired up; delete stays reachable via the
          button above. */}
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-gray-300" aria-hidden="true">
        <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </li>
  );
}
