// src/theme/categoryStyles.ts
// Per-category icon/color lookup, matching the Claude Design's 8
// category swatches. Shared by ItemCard, QuickAddBar, AddItemSheet,
// Dashboard and Statistics - single source of truth for "what does this
// category look like" rather than each caller guessing a color.
export interface CategoryStyle {
  icon: string;
  bg: string;
  text: string;
  fill: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'מוצרי חלב': { icon: '🥛', bg: 'bg-blue-50', text: 'text-blue-700', fill: 'bg-blue-500' },
  'בשר ודגים': { icon: '🐟', bg: 'bg-red-50', text: 'text-red-700', fill: 'bg-red-500' },
  'ירקות': { icon: '🥦', bg: 'bg-green-50', text: 'text-green-700', fill: 'bg-green-500' },
  'פירות': { icon: '🍎', bg: 'bg-amber-50', text: 'text-amber-700', fill: 'bg-amber-500' },
  'ניקיון': { icon: '🧼', bg: 'bg-purple-50', text: 'text-purple-700', fill: 'bg-purple-500' },
  'קפואים': { icon: '🧊', bg: 'bg-cyan-50', text: 'text-cyan-700', fill: 'bg-cyan-500' },
  'משקאות': { icon: '🥤', bg: 'bg-pink-50', text: 'text-pink-700', fill: 'bg-pink-500' },
  // Both spellings map to the same style: "מאפייה" is the name given in
  // the design spec, "מאפים ולחם" is what the default-categories
  // migration actually seeds - covering both means real seeded data
  // gets a color, not just the fallback.
  'מאפייה': { icon: '🥐', bg: 'bg-orange-50', text: 'text-orange-700', fill: 'bg-orange-500' },
  'מאפים ולחם': { icon: '🥐', bg: 'bg-orange-50', text: 'text-orange-700', fill: 'bg-orange-500' },
};

const FALLBACK_STYLE: CategoryStyle = { icon: '🛒', bg: 'bg-gray-50', text: 'text-gray-700', fill: 'bg-gray-400' };

export function getCategoryStyle(name: string | null | undefined): CategoryStyle {
  if (!name) return FALLBACK_STYLE;
  return CATEGORY_STYLES[name] ?? FALLBACK_STYLE;
}
