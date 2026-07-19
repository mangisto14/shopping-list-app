// e2e/categories.spec.ts
import { test, expect } from '@playwright/test';
import { mockListData, seedAuthSession } from './fixtures';

test.describe('Create Category', () => {
  test('adding a category shows it in the list', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { categories: [] });

    await page.goto('/categories');

    // Categories page was redesigned into a card grid with category
    // creation behind a bottom sheet (CategorySheet.tsx) - there is no
    // always-visible inline input anymore. `exact: true` avoids matching
    // the empty-state's own "קטגוריה חדשה" action button, which also
    // contains the substring "חדשה".
    await page.getByRole('button', { name: 'חדשה', exact: true }).click();

    const sheet = page.getByTestId('bottom-sheet');
    await expect(sheet.getByText('קטגוריה חדשה')).toBeVisible();

    await sheet.getByPlaceholder('שם הקטגוריה').fill('ירקות ופירות');
    await sheet.getByRole('button', { name: 'שמירה' }).click();

    // The category name renders as plain text inside a CategoryCard now.
    await expect(page.getByText('ירקות ופירות')).toBeVisible();
  });

  test('empty category list shows a proper empty state, not a blank screen', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { categories: [] });

    await page.goto('/categories');

    await expect(page.getByText('אין עדיין קטגוריות')).toBeVisible();
  });
});
