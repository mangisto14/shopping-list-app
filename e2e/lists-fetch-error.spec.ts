// Regression test for the bug documented in ROOT_CAUSE_ANALYSIS.md: a
// `lists` fetch that fails (400, as it would against a live DB missing
// a column the frontend queries for) must not be treated the same as
// "confirmed zero lists" - it must not wipe a valid persisted active
// list, and the UI must show a distinct error state, not the empty-
// list state.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

const ACTIVE_LIST_STORAGE_KEY = 'shopping-list:activeListId';
const CAT_DAIRY = 'e2e-cat-dairy';

test('a failed lists fetch shows an error state and preserves the persisted active list', async ({ page }) => {
  await seedAuthSession(page);
  // Simulate a user who already had a working active list selected
  // before this outage - this is the persisted state the bug used to wipe.
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: ACTIVE_LIST_STORAGE_KEY, value: LIST_ID }
  );

  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'גבינה צהובה', is_done: false, position: 0 },
    ],
  });

  // Override the lists mock to fail, simulating a select against a
  // column that doesn't exist yet on the live DB (PostgREST 400).
  await page.route('**/rest/v1/lists*', (route) => {
    if (route.request().method() === 'POST') return route.fallback();
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'column lists.archived does not exist', code: '42703' }),
    });
  });

  await page.goto('/');

  // Error state, not the "create your first list" empty state.
  await expect(page.getByText('לא ניתן לטעון את הרשימות')).toBeVisible();
  await expect(page.getByText('אין עדיין רשימות')).not.toBeVisible();

  // The persisted active list must survive an unrelated fetch failure.
  const storedActiveListId = await page.evaluate((key) => localStorage.getItem(key), ACTIVE_LIST_STORAGE_KEY);
  expect(storedActiveListId).toBe(LIST_ID);
});
