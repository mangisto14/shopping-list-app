// e2e/smart-import-ai-assistant.spec.ts
// Smart Import Phase 2C: User Learning + the real AI Assistant (a
// Supabase Edge Function calling Claude server-side - mocked here via
// page.route, same technique this whole suite already uses for every
// other Supabase endpoint; no live network/Claude call is ever made in
// this test file). Covers the "קישוא" scenario the spec itself
// describes: first import resolves via AI and the user accepts it as-is
// (saved as an approved_ai learning row); the user then corrects it
// manually (the correction is saved, taking priority over approved_ai);
// a later import of the same text is resolved from the learning table
// alone, with the AI Assistant never called at all; and an existing
// manual correction is never overwritten by a later approved_ai save.
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

test.describe('Smart Import (Phase 2C - User Learning + AI Assistant)', () => {
  test('AI Assistant resolves an unresolved item; accepting it as-is saves an approved_ai learning row', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: CATEGORIES });

    // Echoes back a category suggestion for whatever candidateId the
    // client actually sent - real ids are generated at runtime
    // (crypto.randomUUID()), never known ahead of time.
    await page.route('**/functions/v1/import-ai-assistant*', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const suggestions = body.items.map((item: { candidateId: string }) => ({
        candidateId: item.candidateId,
        category: { value: 'ירקות', confidence: 'medium' },
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ providerId: 'claude', suggestions, warnings: [] }),
      });
    });

    const learningWrites: { category_id?: string; original_text?: string; source?: string }[] = [];
    await page.route('**/rest/v1/user_import_learning*', async (route) => {
      // Corrections are saved as a single batched upsert (an array
      // body), even when there's only one - see
      // LearningRepository.saveCorrections. GET requests (the lookup at
      // the start of the import, and saveCorrections' own priority
      // check before its upsert) get an empty table back - there is no
      // pre-existing row in this scenario.
      if (route.request().method() === 'POST') learningWrites.push(...JSON.parse(route.request().postData() || '[]'));
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(row).toContainText('ירקות');

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    expect(learningWrites).toHaveLength(1);
    expect(learningWrites[0].category_id).toBe('cat-veg');
    expect(learningWrites[0].original_text).toBe('קישוא');
    expect(learningWrites[0].source).toBe('approved_ai');
  });

  test('correcting the AI Assistant\'s suggestion saves the correction', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID, categories: CATEGORIES });

    await page.route('**/functions/v1/import-ai-assistant*', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const suggestions = body.items.map((item: { candidateId: string }) => ({
        candidateId: item.candidateId,
        category: { value: 'ירקות', confidence: 'medium' },
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ providerId: 'claude', suggestions, warnings: [] }),
      });
    });

    const learningWrites: { category_id?: string; original_text?: string; source?: string }[] = [];
    await page.route('**/rest/v1/user_import_learning*', async (route) => {
      // Corrections are saved as a single batched upsert (an array
      // body), even when there's only one - see
      // LearningRepository.saveCorrections.
      if (route.request().method() === 'POST') learningWrites.push(...JSON.parse(route.request().postData() || '[]'));
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(row).toContainText('ירקות');

    // Open the shared editor and switch the category to פירות.
    await row.click();
    await page.getByRole('button', { name: /ירקות/ }).click();
    await page.getByRole('option', { name: 'פירות' }).click();
    await page.getByRole('button', { name: 'סגירה - חזרה לרשימה' }).click();

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    expect(learningWrites).toHaveLength(1);
    expect(learningWrites[0].category_id).toBe('cat-fruit');
    expect(learningWrites[0].original_text).toBe('קישוא');
    expect(learningWrites[0].source).toBe('manual');
  });

  test('a learning-table hit resolves the item and the AI Assistant is never called', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: CATEGORIES,
      learningRows: [{ original_text: 'קישוא', normalized_name: null, category_id: 'cat-fruit', unit: null, quantity: null }],
    });

    let aiAssistantCalled = false;
    await page.route('**/functions/v1/import-ai-assistant*', async (route) => {
      aiAssistantCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providerId: 'claude', suggestions: [], warnings: [] }) });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(row).toContainText('פירות');

    expect(aiAssistantCalled).toBe(false);
  });

  test('an existing manual correction is never overwritten by a later approved_ai save', async ({ page }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    // A manual correction already on file for קישוא - the learning
    // lookup resolves the item from this row (same as the previous
    // test), so the AI Assistant is never called, and the user accepts
    // it as-is. That "accepted without edits" outcome would normally be
    // saved as approved_ai, but it must never be allowed to clobber
    // this existing manual row.
    const existingLearningRow = {
      original_text: 'קישוא',
      normalized_name: null,
      category_id: 'cat-fruit',
      unit: null,
      quantity: null,
      source: 'manual',
    };
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: CATEGORIES,
      learningRows: [existingLearningRow],
    });

    let aiAssistantCalled = false;
    await page.route('**/functions/v1/import-ai-assistant*', async (route) => {
      aiAssistantCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providerId: 'claude', suggestions: [], warnings: [] }) });
    });

    const learningWrites: unknown[] = [];
    await page.route('**/rest/v1/user_import_learning*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '[]');
        learningWrites.push(...body);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
      }
      // GET: both the initial learning lookup and saveCorrections' own
      // priority check see the same pre-existing manual row.
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([existingLearningRow]) });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();
    await page.locator('textarea').fill('קישוא');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();

    const row = page.getByRole('button', { name: /^כלול פריט זה בייבוא קישוא/ });
    await expect(row).toContainText('פירות');

    await page.getByRole('button', { name: /הוספת \d+ פריטים/ }).click();
    await expect(page.getByRole('heading', { name: 'ייבוא חכם' })).toHaveCount(0);

    expect(aiAssistantCalled).toBe(false);
    // The attempted approved_ai save was blocked by LearningRepository's
    // priority check before it ever reached an upsert - no write at all.
    expect(learningWrites).toEqual([]);
  });
});
