// e2e/smart-import.spec.ts
// Smoke test for Smart Import Phase 1: the entry point lives on the
// Lists screen (not HeaderMenu2 - see docs/smart-import-architecture.md
// change #1), is gated behind the existing `enableExperimentalFeatures`
// devtools flag, and the paste-text -> preview -> confirm path actually
// reaches the same `addItem` insert path every other item-creation flow
// in this app uses.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, USER_ID } from './fixtures';

async function enableExperimentalFeatures(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dev-settings:featureFlags', JSON.stringify({ enableExperimentalFeatures: true }));
  });
}

test.describe('Smart Import (Phase 1)', () => {
  test('entry point is hidden when the experimental-features flag is off', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID });

    await page.goto('/lists');
    await expect(page.getByText('הרשימה שלי')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ייבוא חכם' })).toHaveCount(0);
  });

  test('paste text -> preview -> confirm reaches the real item-insert path', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID });

    const insertedItems: { name: string }[] = [];
    await page.route('**/rest/v1/items*', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      const body = JSON.parse(route.request().postData() || '{}');
      insertedItems.push({ name: body.name });
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `new-item-${insertedItems.length}`, ...body }),
      });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    // Every registered source is shown - paste-text enabled, the rest
    // marked "Coming Soon" and disabled (approved design change #3).
    await expect(page.getByText('בקרוב')).toHaveCount(7);
    await expect(page.getByRole('button', { name: /מצלמה/ })).toBeDisabled();

    await page.locator('textarea').fill('חלב\nלחם');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    // Preview renders both parsed rows, each independently editable.
    await expect(page.locator('input[placeholder="שם הפריט"]')).toHaveCount(2);

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();

    await expect(async () => {
      expect(insertedItems.map((i) => i.name).sort()).toEqual(['חלב', 'לחם'].sort());
    }).toPass();
  });

  test('Preview displays AI-enriched data: category suggestion badge and a duplicate merge suggestion', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: [{ id: 'cat-dairy', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, name: 'מוצרי חלב' }],
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    // "חלב" has no category yet -> AI Analysis should suggest the
    // existing "מוצרי חלב" category (medium confidence, auto-applied +
    // highlighted, per the approved confidence rule) and badge it.
    // "עגבניה"/"עגבניות" are a near-duplicate pair within this same
    // batch -> a merge suggestion, never applied automatically.
    await page.locator('textarea').fill('חלב\nעגבניה\nעגבניות');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    // Compact rows show the category right away (already auto-applied,
    // medium confidence) without needing to expand anything.
    const dairyRowHeader = page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב/ });
    await expect(dairyRowHeader).toContainText('מוצרי חלב');

    // Expanding the row reveals the per-field AI indicator with a
    // confidence emoji (never numeric confidence).
    await dairyRowHeader.click();
    await expect(page.getByText('🟡 קטגוריה שויכה')).toBeVisible();

    // Collapsing it and expanding the duplicate-flagged row instead
    // (only one row may be expanded at a time) surfaces the merge
    // suggestion - a suggestion only, applied solely via this explicit tap.
    await dairyRowHeader.click();
    const duplicateRowHeader = page.getByRole('button', { name: /^כלול פריט זה בייבוא עגבניות/ });
    await duplicateRowHeader.click();

    const mergeBanner = page.getByText(/דומה ל/);
    await expect(mergeBanner).toBeVisible();
    await page.getByRole('button', { name: 'מיזוג' }).click();
    await expect(mergeBanner).toHaveCount(0);
  });
});
