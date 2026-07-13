// src/components/shopping/ItemCard.tsx
import { useState } from 'react';
import type { Item } from '../../hooks/useItems';

interface ItemCardProps {
  item: Item;
  categoryIcon?: string;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (id: string, newName: string) => void;
}

export default function ItemCard({ item, categoryIcon, onToggle, onDelete, onRename }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);

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
      className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-gray-50 ${
        item.is_done ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={onToggle}
        aria-label="toggle item"
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          item.is_done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-gray-300 hover:border-emerald-400'
        }`}
      >
        {item.is_done && <span className="text-xs leading-none">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border-b border-blue-400 bg-transparent focus:outline-none text-sm"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={`w-full truncate text-sm font-medium ${
              item.is_done ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {item.name}
          </button>
        )}
        {/* TODO: replace with real attribution once item rows carry a
            joinable profile (display name/avatar). There is no
            profiles table yet - same limitation already flagged on the
            Lists page's member panel. Placeholder only, not wired to
            item.user_id. */}
        <p className="text-xs text-gray-400 mt-0.5">נוסף ע״י חבר</p>
      </div>

      {categoryIcon && <span className="flex-shrink-0 text-lg opacity-70">{categoryIcon}</span>}

      <button
        onClick={onDelete}
        aria-label="delete item"
        className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors px-1"
      >
        🗑️
      </button>
    </li>
  );
}
