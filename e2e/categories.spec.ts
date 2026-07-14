// e2e/categories.spec.ts
import { test, expect } from '@playwright/test';
import { mockListData, seedAuthSession } from './fixtures';

test.describe('Create Category', () => {
  test('adding a category shows it in the list', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { categories: [] });

    await page.goto('/categories');

    const input = page.locator('#new-category-input');
    await expect(input).toBeVisible();
    await input.fill('ירקות ופירות');
    await page.getByRole('button', { name: 'הוסף', exact: true }).click();

    // The category name renders inside an editable <input value>, not
    // as plain text - getByText() can't see input values, so this
    // checks the value directly instead.
    await expect(page.locator('ul li input').first()).toHaveValue('ירקות ופירות');
  });

  test('empty category list shows a proper empty state, not a blank screen', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { categories: [] });

    await page.goto('/categories');

    await expect(page.getByText('אין עדיין קטגוריות')).toBeVisible();
  });
});
