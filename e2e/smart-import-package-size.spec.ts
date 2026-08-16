// e2e/smart-import-package-size.spec.ts
// Regression coverage for the "500 grams becomes a shopping quantity
// of 500" bug: a number attached to a MEASUREMENT unit (גרם/ק"ג/ליטר/
// מ"ל) describes a single package's size, not how many to buy - see
// src/import/knowledge/units.ts's isMeasurementUnit and
// src/import/semantic/SemanticAnalyzer.ts. Confirms the real end-to-end
// symptom the bug report described (repeated addItem calls blowing up
// the shopping quantity), not just the parsed candidate fields already
// covered at the unit-test level (src/import/__tests__/ImportService.test.ts).
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, USER_ID } from './fixtures';

async function enableExperimentalFeatures(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dev-settings:featureFlags', JSON.stringify({ enableExperimentalFeatures: true }));
  });
}

test.describe('Smart Import - package-size measurements never inflate the shopping quantity', () => {
  test('"קורנפלקס 500 גרם" -> Preview shows quantity 1 with "500 גרם" as package info, and commit inserts exactly ONE row', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID });

    const insertedItems: { name: string; unit?: string | null }[] = [];
    await page.route('**/rest/v1/items*', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      const body = JSON.parse(route.request().postData() || '{}');
      insertedItems.push({ name: body.name, unit: body.unit });
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `new-item-${insertedItems.length}`, ...body }),
      });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קורנפלקס 500 גרם');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    // Preview shows "500 גרם" as the package-size info right after the
    // product name - quantity is 1 under the hood (verified via
    // insertedItems below), but the row doesn't display a redundant
    // "1" next to a package-size unit (see ImportPreviewRow.tsx's
    // formatQuantityAndUnit) - a bare "1 500 גרם" would read as two
    // consecutive numbers, easily misread as quantity 1500.
    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קורנפלקס 500 גרם/ });
    await expect(row).toBeVisible();

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    // The critical regression guard: exactly ONE insert, never a loop
    // of 500 (or anything close to the "reached quantity 67 before I
    // stopped it" symptom from the original bug report).
    await expect(async () => {
      expect(insertedItems).toHaveLength(1);
    }).toPass();
    expect(insertedItems[0].name).toBe('קורנפלקס');
    expect(insertedItems[0].unit).toBe('500 גרם');
  });

  test('a genuine shopping count ("קורנפלקס 3") is unaffected - still inserts 3 separate rows', async ({ page }) => {
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
    await page.locator('textarea').fill('קורנפלקס 3');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קורנפלקס 3 ·/ });
    await expect(row).toBeVisible();

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    await expect(async () => {
      expect(insertedItems).toHaveLength(3);
    }).toPass();
    expect(insertedItems.every((i) => i.name === 'קורנפלקס')).toBe(true);
  });
});
