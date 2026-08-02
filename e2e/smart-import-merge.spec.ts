// e2e/smart-import-merge.spec.ts
// Smart Import - final commit fixes: (1) an item's stored name must
// never contain an embedded quantity value, even for a product the
// knowledge base doesn't recognize; (2) importing an item that matches
// an existing ACTIVE item on the list merges into it (more rows added
// to its existing group, per ShoppingList.tsx's clusterByName - see
// quantity-grouping.spec.ts) rather than creating a second, duplicate-
// looking group.
//
// The Smart Import entry point lives on /lists (ListsPage), but the
// grouped "Nx" item display it's being verified against lives on /
// (ShoppingList) - every test that checks post-import grouping
// navigates there after closing the import sheet.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

async function enableExperimentalFeatures(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dev-settings:featureFlags', JSON.stringify({ enableExperimentalFeatures: true }));
  });
}

const CAT_VEG = { id: 'cat-veg', list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' };

test.describe('Smart Import - name cleanup + merge with existing items', () => {
  test('"קישוא 3" -> Preview shows name קישוא (no embedded quantity) and quantity 3 separately', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    // קישוא is deliberately unknown to the knowledge base - this proves
    // the cleanup doesn't depend on product recognition.
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: [CAT_VEG] });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא 3');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    // The row's name is exactly "קישוא" - never "קישוא 3" - with "3"
    // shown separately as the quantity. No `$` anchor: the row's
    // accessible name concatenates the checkbox label, name, quantity,
    // and category text with no separator, so only a prefix match is
    // reliable here (see smart-import-semantic.spec.ts's own note).
    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('3');

    await row.click();
    await expect(page.locator('input[placeholder="שם הפריט"]')).toHaveValue('קישוא');
  });

  test('existing "קישוא" x2 + imported "קישוא 3" -> one grouped row of 5, no duplicate group', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);

    // A mutable array, not just a tracking log - fed back as the GET
    // response body too, so a post-import page.goto('/') reload (which
    // re-fetches items) reflects the newly inserted rows instead of
    // still returning the original 2-item fixture snapshot.
    let nextId = 100;
    const items = [
      { id: 'item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG.id, name: 'קישוא', is_done: false, position: 0, unit: null, notes: null },
      { id: 'item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG.id, name: 'קישוא', is_done: false, position: 1, unit: null, notes: null },
    ];
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: [CAT_VEG], items });
    await page.route('**/rest/v1/items*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const created = { id: `new-item-${nextId++}`, ...body };
        items.push(created);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      }
      return route.fallback();
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא 3');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();
    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    // Exactly 3 new rows inserted (the imported quantity), all using
    // the existing item's exact name and category - never a fresh,
    // differently-categorized guess - so they join its group.
    await expect.poll(() => items.length).toBe(5);
    for (const item of items.slice(2)) {
      expect(item.name).toBe('קישוא');
      expect(item.category_id).toBe(CAT_VEG.id);
    }

    // The shopping list itself (not /lists) now shows one "5x" group.
    await page.goto('/');
    await expect(page.getByText('קישוא')).toHaveCount(1);
    await expect(page.getByText('5x')).toBeVisible();
  });

  test('editing the quantity in Preview before confirming uses the edited value for the merge', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);

    // Mutable, and fed back as the GET response (see the previous
    // test's comment for why) - existing 1 + edited-to 4 = one grouped
    // row of 5 once the sheet closes and the list reloads.
    let nextId = 100;
    const items = [
      { id: 'item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG.id, name: 'קישוא', is_done: false, position: 0, unit: null, notes: null },
    ];
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: [CAT_VEG], items });
    await page.route('**/rest/v1/items*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const created = { id: `new-item-${nextId++}`, ...body };
        items.push(created);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      }
      return route.fallback();
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא 2');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await row.click();
    // Bump quantity from the parsed 2 up to 4 before confirming.
    const increaseButton = page.getByRole('button', { name: 'increase quantity' });
    await increaseButton.click();
    await increaseButton.click();
    await page.getByRole('button', { name: 'סגירה - חזרה לרשימה' }).click();

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    // 4 new rows (the edited value), not 2 (the original parsed value).
    await expect.poll(() => items.length).toBe(5);

    await page.goto('/');
    await expect(page.getByText('5x')).toBeVisible();
  });

  test('no duplicate group appears after import - only one row for the merged product', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);

    let nextId = 100;
    const items = [
      { id: 'item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG.id, name: 'קישוא', is_done: false, position: 0, unit: null, notes: null },
      { id: 'item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG.id, name: 'קישוא', is_done: false, position: 1, unit: null, notes: null },
    ];
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: [CAT_VEG], items });
    await page.route('**/rest/v1/items*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const created = { id: `new-item-${nextId++}`, ...body };
        items.push(created);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      }
      return route.fallback();
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא 3');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();
    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    await page.goto('/');
    // "קישוא" text appears exactly once on the page - one grouped row,
    // not a second cluster for the newly-imported quantity.
    await expect(page.getByText('קישוא')).toHaveCount(1);
    await expect(page.getByText('5x')).toBeVisible();
  });
});
