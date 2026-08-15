// src/utils/shoppingListGrouping.ts
// Shared item-grouping/quantity logic, extracted from ShoppingList.tsx
// so any other consumer (e.g. buildShoppingListText.ts, for the Copy
// List feature) reuses the exact same clustering/grouping semantics
// the on-screen list itself uses, rather than a second, potentially
// diverging implementation. Behavior is unchanged from what
// ShoppingList.tsx had inline - this is a pure extraction.
import type { Item } from '../hooks/useItems';
import type { Category } from '../hooks/useCategories';

export interface CategoryGroup {
  categoryId: string | null; // null = uncategorized
  categoryName: string | null;
  items: Item[];
}

export interface ItemCluster {
  key: string;
  representative: Item;
  ids: string[];
}

// Groups items with an identical name into one displayed row ("Nx").
// Deliberately keyed on exact name only - different names are never
// merged, even within the same category. Each underlying row is still
// its own `items` record; this is a display/interaction grouping layer
// only, not a schema change. Order is preserved (first occurrence
// order), so a cluster doesn't jump position when its count changes.
export function clusterByName(items: Item[]): ItemCluster[] {
  const clusters = new Map<string, ItemCluster>();
  for (const item of items) {
    const existing = clusters.get(item.name);
    if (existing) {
      existing.ids.push(item.id);
    } else {
      clusters.set(item.name, { key: item.name, representative: item, ids: [item.id] });
    }
  }
  return [...clusters.values()];
}

// Groups items by category, preserving the categories list's own order,
// with any uncategorized items collected into a trailing group. Empty
// groups are dropped - a category with nothing in this section (e.g. no
// completed dairy items yet) shouldn't render an empty header.
export function groupByCategory(items: Item[], categories: Category[]): CategoryGroup[] {
  const byId = new Map<string, CategoryGroup>(
    categories.map((c) => [c.id, { categoryId: c.id, categoryName: c.name, items: [] }])
  );
  const uncategorized: CategoryGroup = { categoryId: null, categoryName: null, items: [] };

  for (const item of items) {
    const group = (item.category_id && byId.get(item.category_id)) || uncategorized;
    group.items.push(item);
  }

  const groups = [...byId.values()].filter((g) => g.items.length > 0);
  if (uncategorized.items.length > 0) groups.push(uncategorized);
  return groups;
}
