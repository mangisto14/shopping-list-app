// e2e/items.spec.ts
import { test, expect } from '@playwright/test';
import { mockListData, seedAuthSession, LIST_ID, USER_ID } from './fixtures';

const CAT_DAIRY = 'e2e-cat-dairy';

test.describe('Create Item', () => {
  test('adding an item through the add-item sheet shows it on the list', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, {
      categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
      items: [],
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'add item' }).click();

    const sheet = page.getByTestId('bottom-sheet');
    await expect(sheet.getByText('הוספת פריט חדש')).toBeVisible();

    await sheet.getByPlaceholder('הוסף פריט...').fill('חלב 3%');
    await sheet.getByRole('button', { name: /מוצרי חלב/ }).click();
    await sheet.getByRole('button', { name: /הוסף לרשימה/ }).click();

    await expect(page.getByText('חלב 3%')).toBeVisible();
  });

  test('empty list shows a proper empty state, not a blank screen', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { categories: [], items: [] });

    await page.goto('/');

    await expect(page.getByText('הרשימה ריקה')).toBeVisible();
  });
});

test.describe('Complete Item', () => {
  test('toggling an item marks it as done', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, {
      categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
      items: [
        { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'גבינה צהובה', is_done: false, position: 0 },
      ],
    });

    await page.goto('/');
    const itemName = page.getByText('גבינה צהובה');
    await expect(itemName).toBeVisible();
    await expect(itemName).not.toHaveClass(/line-through/);

    await page.getByRole('button', { name: 'toggle item' }).click();

    await expect(itemName).toHaveClass(/line-through/);
  });
});
