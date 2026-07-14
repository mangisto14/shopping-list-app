// src/components/shopping/CategorySection.tsx
import { useState } from 'react';
import type { Item } from '../../hooks/useItems';
import ItemCard from './ItemCard';

interface CategoryLike {
  id: string;
  name: string;
}

interface CategorySectionProps {
  category: CategoryLike | null; // null = the "uncategorized" group
  items: Item[];
  uncategorizedLabel: string;
  onToggle: (item: Item) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const CATEGORY_STYLES: Record<string, { icon: string; bg: string; text: string; fill: string }> = {
  'מוצרי חלב': { icon: '🥛', bg: 'bg-blue-50', text: 'text-blue-700', fill: 'bg-blue-500' },
  'בשר ודגים': { icon: '🍖', bg: 'bg-red-50', text: 'text-red-700', fill: 'bg-red-500' },
  'ירקות': { icon: '🥦', bg: 'bg-green-50', text: 'text-green-700', fill: 'bg-green-500' },
  // Both spellings map to the same style: "מאפייה" is the name given in
  // the design spec, "מאפים ולחם" is what the default-categories
  // migration actually seeds - covering both means real seeded data
  // gets a color, not just the fallback.
  'מאפייה': { icon: '🍞', bg: 'bg-orange-50', text: 'text-orange-700', fill: 'bg-orange-500' },
  'מאפים ולחם': { icon: '🍞', bg: 'bg-orange-50', text: 'text-orange-700', fill: 'bg-orange-500' },
};

const FALLBACK_STYLE = { icon: '🛒', bg: 'bg-gray-50', text: 'text-gray-700', fill: 'bg-gray-400' };

export function getCategoryStyle(name: string | null | undefined) {
  if (!name) return FALLBACK_STYLE;
  return CATEGORY_STYLES[name] ?? FALLBACK_STYLE;
}

export default function CategorySection({
  category,
  items,
  uncategorizedLabel,
  onToggle,
  onDelete,
  onRename,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const style = getCategoryStyle(category?.name);
  const name = category?.name ?? uncategorizedLabel;
  const doneCount = items.filter((i) => i.is_done).length;

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-1 py-1.5 group"
      >
        <span className="flex items-center gap-2">
          <span className="bg-violet-100 text-violet-700 rounded-full px-2.5 py-0.5 text-xs font-bold">
            {doneCount}/{items.length}
          </span>
          <span className={`inline-block text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>⌄</span>
        </span>
        <span className="flex items-center gap-2 font-bold text-gray-800">
          {name}
          <span className="text-lg">{style.icon}</span>
        </span>
      </button>

      {expanded && (
        <ul className="space-y-2 mt-1.5 transition-all">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categoryIcon={style.icon}
              onToggle={() => onToggle(item)}
              onDelete={() => onDelete(item.id)}
              onRename={onRename}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
