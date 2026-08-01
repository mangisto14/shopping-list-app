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

    // Preview renders both parsed rows, compact by default (Phase 2A) -
    // both are still included and confirmable without expanding either.
    await expect(page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^כלול פריט זה בייבוא לחם/ })).toBeVisible();

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
    // medium confidence) without needing to open anything.
    const dairyRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב/ });
    await expect(dairyRow).toContainText('מוצרי חלב');

    // Selecting the row opens the single shared editor, which shows
    // the per-field AI indicator with a confidence emoji (never
    // numeric confidence).
    await dairyRow.click();
    await expect(page.getByText('🟡 קטגוריה שויכה')).toBeVisible();

    // Closing returns to the compact list; selecting the duplicate-
    // flagged row instead surfaces the merge suggestion in that same
    // single editor instance - a suggestion only, applied solely via
    // this explicit tap.
    await page.getByRole('button', { name: 'סגירה - חזרה לרשימה' }).click();
    await page.getByRole('button', { name: /^כלול פריט זה בייבוא עגבניות/ }).click();

    const mergeBanner = page.getByText(/דומה ל/);
    await expect(mergeBanner).toBeVisible();
    await page.getByRole('button', { name: 'מיזוג' }).click();
    await expect(mergeBanner).toHaveCount(0);
  });

  test('a single shared editor instance opens per selected row and closes back to the compact list', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('חלב\nלחם');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    await expect(page.getByText('🤖 ניתוח AI הושלם')).toBeVisible();

    // No editor is mounted at all until a row is selected - unlike the
    // previous per-row (inert-when-collapsed) design, there is nothing
    // to find here even with a plain CSS locator.
    await expect(page.locator('input[placeholder="שם הפריט"]')).toHaveCount(0);

    const milkRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב/ });
    const breadRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא לחם/ });
    const nameInput = page.locator('input[placeholder="שם הפריט"]');
    const closeButton = page.getByRole('button', { name: 'סגירה - חזרה לרשימה' });

    // Selecting "חלב" mounts exactly one editor, for that candidate.
    await milkRow.click();
    await expect(nameInput).toHaveCount(1);
    await expect(nameInput).toHaveValue('חלב');
    await expect(milkRow).toHaveCount(0); // the list itself is replaced, not just covered

    // Closing returns to the compact list - editor unmounts entirely.
    await closeButton.click();
    await expect(page.locator('input[placeholder="שם הפריט"]')).toHaveCount(0);
    await expect(milkRow).toBeVisible();

    // Selecting "לחם" reuses the same single editor for the other item.
    await breadRow.click();
    await expect(nameInput).toHaveCount(1);
    await expect(nameInput).toHaveValue('לחם');
  });

  test('AI summary and the bottom action bar stay in place while a long item list scrolls', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    const manyItems = Array.from({ length: 30 }, (_, i) => `פריט מספר ${i + 1}`).join('\n');
    await page.locator('textarea').fill(manyItems);
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const summary = page.getByText(/פריטים זוהו/).first();
    const confirmButton = page.getByRole('button', { name: /הוספת \d+ פריטים/ });
    await expect(summary).toBeVisible();
    await expect(confirmButton).toBeVisible();

    const summaryBoxBefore = await summary.boundingBox();
    const confirmBoxBefore = await confirmButton.boundingBox();

    // Scroll the sheet - the row list is what should move, not the
    // summary or the action bar.
    await page.locator('[data-testid="bottom-sheet"]').evaluate((el) => {
      const scrollable = el.querySelector('.overflow-y-auto');
      scrollable?.scrollBy(0, 400);
    });

    await expect(summary).toBeVisible();
    await expect(confirmButton).toBeVisible();
    const summaryBoxAfter = await summary.boundingBox();
    const confirmBoxAfter = await confirmButton.boundingBox();

    expect(summaryBoxAfter?.y).toBeCloseTo(summaryBoxBefore?.y ?? 0, 0);
    expect(confirmBoxAfter?.y).toBeCloseTo(confirmBoxBefore?.y ?? 0, 0);
  });
});
