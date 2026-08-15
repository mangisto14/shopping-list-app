// e2e/smart-import-category-creation.spec.ts
// Coverage for creating a new category directly from Smart Import's
// category selector (CategoryDropdown, reused - not redesigned - from
// QuickAddBar's own picker) when the typed name doesn't match any
// existing category. Reuses useCategories().addCategory, the exact
// same repository the standalone Categories page already uses.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, USER_ID, LIST_ID } from './fixtures';

const CAT_VEG = 'e2e-cat-veg';

async function enableExperimentalFeatures(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('dev-settings:featureFlags', JSON.stringify({ enableExperimentalFeatures: true }));
  });
}

test.describe('Smart Import - create category from the category selector', () => {
  test('searching a non-existing category name offers to create it; creating selects it immediately and it survives closing/reopening the selector', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: [{ id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' }],
    });

    let categoryInsertBody: Record<string, unknown> | null = null;
    await page.route('**/rest/v1/categories*', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      categoryInsertBody = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-cat-breakfast', ...categoryInsertBody }),
      });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    // "קורנפלקס" isn't in the knowledge base and has no matching
    // category - opens with no category assigned.
    await page.locator('textarea').fill('קורנפלקס');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();
    await expect(page.getByText('🤖 ניתוח AI הושלם')).toBeVisible();

    await page.getByRole('button', { name: /^כלול פריט זה בייבוא קורנפלקס/ }).click();

    // Opens the category picker from the single shared item editor.
    await page.getByRole('button', { name: /ללא קטגוריה/ }).click();
    await expect(page.getByRole('listbox', { name: 'בחר קטגוריה' })).toBeVisible();

    // Only one category exists, well under the search-box threshold -
    // the input must still appear here (unlike QuickAddBar's picker)
    // since typing is the only way to name a new category.
    const searchInput = page.getByPlaceholder('חיפוש קטגוריה...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('ארוחות בוקר');

    // Genuinely offered, not the plain "no matches" dead end.
    await expect(page.getByText('אין קטגוריות תואמות')).toHaveCount(0);
    const createAction = page.getByRole('option', { name: 'צור קטגוריה "ארוחות בוקר"' });
    await expect(createAction).toBeVisible();

    await createAction.click();

    // The request that actually created it was scoped to this list/user
    // - the existing category model, not a new data-access layer.
    await expect(async () => {
      expect(categoryInsertBody).toMatchObject({ name: 'ארוחות בוקר', list_id: LIST_ID, user_id: USER_ID });
    }).toPass();

    // Selected immediately on the item, dropdown closed, still inside
    // the same Smart Import flow (editor still open, same candidate).
    await expect(page.getByRole('listbox', { name: 'בחר קטגוריה' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /ארוחות בוקר/ })).toBeVisible();
    await expect(page.locator('input[placeholder="שם הפריט"]')).toHaveValue('קורנפלקס');

    // Reopening the same selector: the new category is a real, selected
    // option, not just a label - proving it persisted, not just a
    // one-off local label swap.
    await page.getByRole('button', { name: /ארוחות בוקר/ }).click();
    const newCategoryOption = page.getByRole('option', { name: 'ארוחות בוקר' });
    await expect(newCategoryOption).toBeVisible();
    await expect(newCategoryOption).toHaveAttribute('aria-selected', 'true');
  });

  test('typing an existing category name (different case/whitespace) never offers to create a duplicate', async ({
    page,
  }) => {
    await seedAuthSession(page);
    await enableExperimentalFeatures(page);
    await mockListData(page, {
      listName: 'הרשימה שלי',
      ownerId: USER_ID,
      categories: [{ id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' }],
    });

    let categoryPostCount = 0;
    await page.route('**/rest/v1/categories*', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      categoryPostCount += 1;
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'dup', ...body }) });
    });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'ייבוא חכם' }).click();

    await page.locator('textarea').fill('קורנפלקס');
    await page.getByRole('button', { name: 'ניתוח פריטים' }).click();
    await expect(page.getByText('🤖 ניתוח AI הושלם')).toBeVisible();

    await page.getByRole('button', { name: /^כלול פריט זה בייבוא קורנפלקס/ }).click();
    await page.getByRole('button', { name: /ללא קטגוריה/ }).click();

    // Same category, just padded with extra whitespace - not the exact
    // stored spelling.
    await page.getByPlaceholder('חיפוש קטגוריה...').fill('  ירקות  ');

    await expect(page.getByRole('option', { name: /^צור קטגוריה/ })).toHaveCount(0);
    const existingOption = page.getByRole('option', { name: 'ירקות' });
    await expect(existingOption).toBeVisible();

    await existingOption.click();
    await expect(page.getByRole('button', { name: /ירקות/ })).toBeVisible();
    expect(categoryPostCount).toBe(0);
  });
});
