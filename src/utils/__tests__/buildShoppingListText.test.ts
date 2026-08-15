// src/utils/__tests__/buildShoppingListText.test.ts
import { describe, expect, test } from 'vitest';
import { buildShoppingListText } from '../buildShoppingListText';
import type { Item } from '../../hooks/useItems';
import type { Category } from '../../hooks/useCategories';

const LABELS = { active: 'לקנות', completed: 'הושלם', uncategorized: 'ללא קטגוריה' };

let idCounter = 0;
function makeItem(overrides: Partial<Item> & { name: string }): Item {
  idCounter += 1;
  return {
    id: `item-${idCounter}`,
    list_id: 'list-1',
    user_id: 'user-1',
    is_done: false,
    position: idCounter,
    category_id: null,
    unit: null,
    notes: null,
    ...overrides,
  };
}

function makeCategory(id: string, name: string): Category {
  return { id, list_id: 'list-1', user_id: 'user-1', name };
}

describe('buildShoppingListText', () => {
  test('includes the list name as the first line', () => {
    const text = buildShoppingListText('קנייה שבועית', [], [], LABELS);
    expect(text.split('\n')[0]).toBe('קנייה שבועית');
  });

  test('includes active (not-done) items under the active section', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [makeItem({ name: 'מלפפון', category_id: 'c1', is_done: false })];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text).toContain('🛒 לקנות');
    expect(text).toContain('- מלפפון × 1');
  });

  test('includes completed (done) items under the completed section', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [makeItem({ name: 'עגבנייה', category_id: 'c1', is_done: true })];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text).toContain('✅ הושלם');
    expect(text).toContain('- עגבנייה × 1');
  });

  test('the active section appears before the completed section', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [
      makeItem({ name: 'עגבנייה', category_id: 'c1', is_done: true }),
      makeItem({ name: 'מלפפון', category_id: 'c1', is_done: false }),
    ];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text.indexOf('🛒 לקנות')).toBeLessThan(text.indexOf('✅ הושלם'));
  });

  test('omits the active section entirely when every item is completed', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [makeItem({ name: 'עגבנייה', category_id: 'c1', is_done: true })];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text).not.toContain('🛒 לקנות');
    expect(text).toContain('✅ הושלם');
  });

  test('omits the completed section entirely when nothing is done yet', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [makeItem({ name: 'מלפפון', category_id: 'c1', is_done: false })];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text).not.toContain('✅ הושלם');
    expect(text).toContain('🛒 לקנות');
  });

  test('preserves the categories list\'s own order within a section', () => {
    const categories = [makeCategory('c1', 'ירקות'), makeCategory('c2', 'מוצרי חלב')];
    const items = [
      makeItem({ name: 'חלב', category_id: 'c2', is_done: false }),
      makeItem({ name: 'קישוא', category_id: 'c1', is_done: false }),
    ];
    const text = buildShoppingListText('הרשימה', items, categories, LABELS);
    expect(text.indexOf('ירקות')).toBeLessThan(text.indexOf('מוצרי חלב'));
  });

  test('a category with no items in a given section does not appear in that section', () => {
    const categories = [makeCategory('c1', 'ירקות'), makeCategory('c2', 'מוצרי חלב')];
    // Only ירקות has an active item - מוצרי חלב has none at all.
    const items = [makeItem({ name: 'קישוא', category_id: 'c1', is_done: false })];
    const text = buildShoppingListText('הרשימה', items, categories, LABELS);
    expect(text).toContain('ירקות');
    expect(text).not.toContain('מוצרי חלב');
  });

  test('items with no category are grouped under the uncategorized label', () => {
    const items = [makeItem({ name: 'משהו', category_id: null, is_done: false })];
    const text = buildShoppingListText('הרשימה', items, [], LABELS);
    expect(text).toContain('ללא קטגוריה');
    expect(text).toContain('- משהו × 1');
  });

  test('duplicate (same-name) items are combined into a single line with the effective count', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [
      makeItem({ name: 'קישוא', category_id: 'c1', is_done: false }),
      makeItem({ name: 'קישוא', category_id: 'c1', is_done: false }),
      makeItem({ name: 'קישוא', category_id: 'c1', is_done: false }),
    ];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text).toContain('- קישוא × 3');
    // Not three separate lines for the same name.
    expect(text.match(/קישוא/g)?.length).toBe(1);
  });

  test('contains no internal ids, user ids, or other database metadata', () => {
    const cat = makeCategory('c1', 'ירקות');
    const items = [
      makeItem({ id: 'super-secret-item-id', user_id: 'super-secret-user-id', name: 'קישוא', category_id: 'c1' }),
    ];
    const text = buildShoppingListText('הרשימה', items, [cat], LABELS);
    expect(text).not.toContain('super-secret-item-id');
    expect(text).not.toContain('super-secret-user-id');
    expect(text).not.toContain('c1');
  });

  test('matches the exact required format for a mixed active+completed, multi-category list', () => {
    const categories = [makeCategory('veg', 'ירקות'), makeCategory('dairy', 'מוצרי חלב')];
    const items = [
      makeItem({ name: 'קישוא', category_id: 'veg', is_done: false }),
      makeItem({ name: 'קישוא', category_id: 'veg', is_done: false }),
      makeItem({ name: 'קישוא', category_id: 'veg', is_done: false }),
      makeItem({ name: 'מלפפון', category_id: 'veg', is_done: false }),
      makeItem({ name: 'מלפפון', category_id: 'veg', is_done: false }),
      makeItem({ name: 'חלב 3%', category_id: 'dairy', is_done: false }),
      makeItem({ name: 'עגבנייה', category_id: 'veg', is_done: true }),
      makeItem({ name: 'עגבנייה', category_id: 'veg', is_done: true }),
      makeItem({ name: 'גבינה', category_id: 'dairy', is_done: true }),
    ];
    const text = buildShoppingListText('קנייה שבועית', items, categories, LABELS);

    expect(text).toBe(
      [
        'קנייה שבועית',
        '',
        '🛒 לקנות',
        '',
        'ירקות',
        '- קישוא × 3',
        '- מלפפון × 2',
        '',
        'מוצרי חלב',
        '- חלב 3% × 1',
        '',
        '✅ הושלם',
        '',
        'ירקות',
        '- עגבנייה × 2',
        '',
        'מוצרי חלב',
        '- גבינה × 1',
      ].join('\n')
    );
  });
});
