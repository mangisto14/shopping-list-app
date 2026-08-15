// e2e/copy-list.spec.ts
// Coverage for the "Copy List" action on the Shopping List page: the
// button itself, the two-section (active/completed) plain-text format
// it writes to the clipboard, and the success/failure feedback.
import { test, expect } from '@playwright/test';
import { mockListData, seedAuthSession, LIST_ID, USER_ID } from './fixtures';

const CAT_VEG = 'e2e-cat-veg';
const CAT_DAIRY = 'e2e-cat-dairy';
const COPY_BUTTON_LABEL = 'העתק רשימה';

test.describe('Copy List', () => {
  test('the Copy List action is visible on the shopping list page', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { categories: [], items: [] });

    await page.goto('/');
    await expect(page.getByRole('button', { name: COPY_BUTTON_LABEL })).toBeVisible();
  });

  test('clicking Copy List writes the expected two-section text to the clipboard and shows success feedback', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedAuthSession(page);
    await mockListData(page, {
      listName: 'קנייה שבועית',
      categories: [
        { id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' },
        { id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' },
      ],
      items: [
        { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'קישוא', is_done: false, position: 0 },
        { id: 'e2e-item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'קישוא', is_done: false, position: 1 },
        { id: 'e2e-item-3', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'קישוא', is_done: false, position: 2 },
        { id: 'e2e-item-4', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'מלפפון', is_done: false, position: 3 },
        { id: 'e2e-item-5', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'מלפפון', is_done: false, position: 4 },
        { id: 'e2e-item-6', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 5 },
        { id: 'e2e-item-7', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'עגבנייה', is_done: true, position: 6 },
        { id: 'e2e-item-8', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'עגבנייה', is_done: true, position: 7 },
        { id: 'e2e-item-9', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'גבינה', is_done: true, position: 8 },
      ],
    });

    await page.goto('/');
    await page.getByRole('button', { name: COPY_BUTTON_LABEL }).click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(
      [
        'קנייה שבועית',
        '',
        '🛒 לקנות',
        '',
        'ירקות',
        '- קישוא × 3',
        '- מלפפון × 2',
        '',
        'מוצרי חלב',
        '- חלב 3% × 1',
        '',
        '✅ הושלם',
        '',
        'ירקות',
        '- עגבנייה × 2',
        '',
        'מוצרי חלב',
        '- גבינה × 1',
      ].join('\n')
    );

    await expect(page.getByText('הרשימה הועתקה')).toBeVisible();
  });

  test('a list with only active items produces text with no Completed section', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedAuthSession(page);
    await mockListData(page, {
      categories: [{ id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' }],
      items: [
        { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'קישוא', is_done: false, position: 0 },
      ],
    });

    await page.goto('/');
    await page.getByRole('button', { name: COPY_BUTTON_LABEL }).click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('🛒 לקנות');
    expect(clipboard).not.toContain('✅');
    expect(clipboard).not.toContain('הושלם');
  });

  test('a list with only completed items produces text with no Active section', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedAuthSession(page);
    await mockListData(page, {
      categories: [{ id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' }],
      items: [
        { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'עגבנייה', is_done: true, position: 0 },
      ],
    });

    await page.goto('/');
    await page.getByRole('button', { name: COPY_BUTTON_LABEL }).click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('✅ הושלם');
    expect(clipboard).not.toContain('🛒');
    expect(clipboard).not.toContain('לקנות');
  });

  test('a Clipboard API failure shows a friendly error instead of failing silently', async ({ page }) => {
    await seedAuthSession(page);
    // Stub Clipboard API to always reject, simulating a permissions
    // failure/insecure context/unsupported browser - not granting the
    // clipboard-write permission alone doesn't reliably force a
    // rejection in every engine, so this stubs it directly.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
        configurable: true,
      });
    });
    await mockListData(page, {
      categories: [{ id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' }],
      items: [
        { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'קישוא', is_done: false, position: 0 },
      ],
    });

    await page.goto('/');
    await page.getByRole('button', { name: COPY_BUTTON_LABEL }).click();

    await expect(page.getByText('העתקת הרשימה נכשלה')).toBeVisible();
  });
});
