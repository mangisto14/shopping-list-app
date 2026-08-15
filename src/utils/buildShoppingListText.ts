// src/utils/buildShoppingListText.ts
// Pure text generator for the "Copy List" feature - turns the active
// list's name/items/categories into plain, WhatsApp/Notes/email-
// friendly text. Deliberately reuses clusterByName/groupByCategory
// (the exact same functions ShoppingList.tsx itself renders from)
// rather than re-deriving quantities/grouping here, so the copied text
// can never drift from what's actually shown on screen.
import type { Item } from '../hooks/useItems';
import type { Category } from '../hooks/useCategories';
import { clusterByName, groupByCategory } from './shoppingListGrouping';

export interface ShoppingListTextLabels {
  // Bare section names, no emoji - the emoji prefix is added here, not
  // part of the label itself, so callers' i18n stays emoji-free.
  active: string;
  completed: string;
  uncategorized: string;
}

// item.is_done is the one and only completed flag the rest of the app
// already uses (ShoppingList.tsx's own sectionFor()) - not re-derived
// or reinterpreted here.
export function buildShoppingListText(
  listName: string,
  items: Item[],
  categories: Category[],
  labels: ShoppingListTextLabels
): string {
  const activeItems = items.filter((item) => !item.is_done);
  const completedItems = items.filter((item) => item.is_done);

  const lines: string[] = [listName, ''];
  let wroteASection = false;

  const appendSection = (header: string, sectionItems: Item[]) => {
    if (sectionItems.length === 0) return; // never render an empty section
    if (wroteASection) lines.push('');
    wroteASection = true;

    lines.push(header, '');
    const groups = groupByCategory(sectionItems, categories);
    groups.forEach((group, index) => {
      if (index > 0) lines.push('');
      lines.push(group.categoryName ?? labels.uncategorized);
      for (const cluster of clusterByName(group.items)) {
        lines.push(`- ${cluster.representative.name} × ${cluster.ids.length}`);
      }
    });
  };

  appendSection(`🛒 ${labels.active}`, activeItems);
  appendSection(`✅ ${labels.completed}`, completedItems);

  return lines.join('\n').trimEnd();
}
