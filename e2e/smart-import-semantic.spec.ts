// e2e/smart-import-semantic.spec.ts
// Smart Import Phase 2B: the deterministic knowledge base + semantic
// analysis layer (src/import/knowledge/, src/import/semantic/) - no
// AI/OCR/vendor call involved. Covers the 5 scenarios explicitly
// required by the Phase 2B spec. Kept in its own file rather than
// added to smart-import.spec.ts so that file's existing coverage of
// the AI Analysis stage (Phase 2) and the single shared editor
// (refinement pass) stays untouched.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, USER_ID } from './fixtures';

async function enableExperimentalFeatures(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dev-settings:featureFlags', JSON.stringify({ enableExperimentalFeatures: true }));
  });
}

test.describe('Smart Import (Phase 2B - Knowledge Base & Semantic Analysis)', () => {
  test('recognizes quantity, unit, product name, and category with no AI call for 5 required inputs', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: [
        { id: 'cat-dairy', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, name: 'מוצרי חלב' },
        { id: 'cat-veg', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, name: 'ירקות' },
        { id: 'cat-fruit', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, name: 'פירות' },
      ],
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    await page.locator('textarea').fill(['מלפפון 3', '2 ק"ג תפוחים', 'Milk x2', 'חלב תנובה', 'תפ"א'].join('\n'));
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();
    await expect(page.getByText('🤖 ניתוח AI הושלם')).toBeVisible();

    // 1. "מלפפון 3" -> quantity 3, category ירקות
    const cucumberRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא מלפפון/ });
    await expect(cucumberRow).toContainText('3');
    await expect(cucumberRow).toContainText('ירקות');

    // 2. '2 ק"ג תפוחים' -> quantity 2, unit ק"ג, category פירות (the
    // product name may also canonicalize תפוחים -> תפוח - either
    // spelling is a correct match; the negative lookahead just avoids
    // colliding with the unrelated "תפוח אדמה"/potato row below).
    const appleRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא תפוח(ים)?(?! אדמה)/ });
    await expect(appleRow).toContainText('2 ק"ג');
    await expect(appleRow).toContainText('פירות');

    // 3 + 4. "Milk x2" and "חלב תנובה" both canonicalize to the same
    // product name "חלב" - two independent rows, so assert on the
    // pair rather than a single unique match.
    const milkRows = page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב/ });
    await expect(milkRows).toHaveCount(2);
    await expect(milkRows.nth(0)).toContainText('2'); // "Milk x2" -> quantity 2
    await expect(milkRows.nth(0)).toContainText('מוצרי חלב');
    await expect(milkRows.nth(1)).toContainText('מוצרי חלב'); // "חלב תנובה" -> category מוצרי חלב

    // 5. 'תפ"א' -> product תפוח אדמה, category ירקות
    const potatoRow = page.getByRole('button', { name: /^כלול פריט זה בייבוא תפוח אדמה/ });
    await expect(potatoRow).toContainText('ירקות');
  });

  test('AI Extraction & Enrichment Quality: percentages stay part of the name, trailing quantity+unit and the Hebrew gershayim unit mark are both recognized', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: [
        { id: 'cat-dairy', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, name: 'מוצרי חלב' },
      ],
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    await page.locator('textarea').fill(['חלב 3%', 'חלב 3% 2 ליטר', 'גבינה צהובה 400 גרם', '500 מ״ל חלב'].join('\n'));
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();
    await expect(page.getByText('🤖 ניתוח AI הושלם')).toBeVisible();

    // "חלב 3%" alone - the 3% fat-content is part of the product's
    // identity, not a quantity: the name must stay "חלב 3%" exactly,
    // and quantity must stay at its untouched default of 1 with no
    // unit at all (anchored on the "·" category separator right after
    // - not "1 2 ליטר", which is the *other* row below) - not "3",
    // which is what a naive "last number in the text" rule would have
    // wrongly produced.
    const plainMilkRowNamePattern = new RegExp('^כלול פריט זה בייבוא חלב 3% 1 ·');
    await expect(page.getByRole('button', { name: plainMilkRowNamePattern })).toBeVisible();

    // "חלב 3% 2 ליטר" - the percentage still stays part of the name;
    // the genuine trailing quantity+unit after it IS recognized as a
    // package-size measurement (ליטר), not a shopping count - quantity
    // is 1 under the hood, but the row doesn't display a redundant "1"
    // next to a package-size unit (see ImportPreviewRow.tsx's
    // formatQuantityAndUnit) - just "2 ליטר".
    await expect(page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב 3% 2 ליטר/ })).toBeVisible();

    // "גבינה צהובה 400 גרם" - trailing quantity+unit, multi-word name -
    // same package-size handling: quantity 1 (undisplayed), "400 גרם"
    // shown alone.
    await expect(page.getByRole('button', { name: /^כלול פריט זה בייבוא גבינה צהובה 400 גרם/ })).toBeVisible();

    // "500 מ״ל חלב" - typed with the Hebrew gershayim punctuation mark
    // (״), not the ASCII quote (") the unit is canonically stored
    // with - a package-size measurement: quantity 1 (undisplayed),
    // "500 מ"ל" shown alone.
    await expect(page.getByRole('button', { name: /^כלול פריט זה בייבוא חלב 500 מ"ל/ })).toBeVisible();
  });
});
