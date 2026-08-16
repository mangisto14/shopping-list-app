// e2e/smart-import-category-learning.spec.ts
// Category learning generalizes across differently-phrased imports of
// the same product - a category corrected once applies to a LATER
// import even when the exact typed text never repeats, as long as the
// product identity (mergeKey - see src/import/semantic/mergeKey.ts)
// matches. "קישוא" (zucchini) is used throughout, matching this
// suite's existing convention (see smart-import-ai-assistant.spec.ts) -
// it's deliberately not in the knowledge base, so nothing but this
// learned correction can resolve its category.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

async function enableExperimentalFeatures(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dev-settings:featureFlags', JSON.stringify({ enableExperimentalFeatures: true }));
  });
}

const CATEGORIES = [
  { id: 'cat-veg', list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' },
  { id: 'cat-fruit', list_id: LIST_ID, user_id: USER_ID, name: 'פירות' },
];

test.describe('Smart Import - category learning generalizes across phrasings (mergeKey)', () => {
  test('a manually corrected category is automatically applied to a later, differently-phrased import of the same product, with no AI call', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: CATEGORIES });

    let aiAssistantCallCount = 0;
    await page.route('**/functions/v1/import-ai-assistant*', async (route) => {
      aiAssistantCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ providerId: 'claude', suggestions: [], warnings: [] }),
      });
    });

    // A mutable mock "table": starts empty, grows as saveCorrections
    // (Preview's confirm step) writes to it - the SAME table both
    // imports in this test read from and write to, mirroring
    // production rather than a static per-test fixture.
    let storedRows: Record<string, unknown>[] = [];
    await page.route('**/rest/v1/user_import_learning*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '[]');
        storedRows = [...storedRows, ...body];
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(storedRows) });
    });

    // --- First import: "קישוא", uncategorized until the user manually
    // picks a category in the editor. ---
    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const firstRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(firstRow).toContainText('ללא קטגוריה');

    await firstRow.click();
    await page.getByRole('button', { name: /ללא קטגוריה/ }).click();
    await page.getByRole('option', { name: 'ירקות' }).click();
    await page.getByRole('button', { name: 'סגירה - חזרה לרשימה' }).click();

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    expect(storedRows).toHaveLength(1);
    expect(storedRows[0].original_text).toBe('קישוא');
    expect(storedRows[0].category_id).toBe('cat-veg');
    expect(storedRows[0].merge_key).toBe('קישוא');
    expect(aiAssistantCallCount).toBe(1); // uncategorized + no unit -> sent to AI the first time, nothing learned yet

    // --- Second import: a differently-phrased line for the SAME
    // product - a known, already-tested trailing-quantity shape
    // ("קישוא 3" parses to name "קישוא", quantity 3 - see
    // e2e/smart-import-merge.spec.ts). The exact typed text never
    // matches the first correction's stored original_text ("קישוא"),
    // only the product identity (mergeKey) does. ---
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא 3');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const secondRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(secondRow).toContainText('ירקות');
    await expect(secondRow).toContainText('3'); // quantity is untouched by the category-only fallback

    // No additional AI Assistant call for the second import - the
    // learned category (applied via mergeKey) skipped it entirely.
    expect(aiAssistantCallCount).toBe(1);
  });

  test('a category learned for one product never leaks onto an unrelated product in the same import', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: CATEGORIES,
      // A pre-existing learned correction for "קישוא" only.
      learningRows: [
        { original_text: 'קישוא', normalized_name: null, category_id: 'cat-veg', unit: null, quantity: null, merge_key: 'קישוא' },
      ],
    });

    await page.route('**/functions/v1/import-ai-assistant*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ providerId: 'claude', suggestions: [], warnings: [] }),
      });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    // "קישוא 3" (same product as the learned correction, different
    // phrasing) alongside "בננה" (a genuinely different, unrelated
    // product with no learned correction at all).
    await page.locator('textarea').fill('קישוא 3\nבננה');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const zucchiniRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    const bananaRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא בננה/ });
    await expect(zucchiniRow).toContainText('ירקות');
    // The unrelated product must never receive the learned category.
    await expect(bananaRow).not.toContainText('ירקות');
  });
});
