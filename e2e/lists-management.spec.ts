// e2e/lists-management.spec.ts
// Coverage for the Lists screen's three-dot menu (Phase 2 of this
// session's work), which had zero automated coverage before this QA
// pass: rename, archive/unarchive, delete. The mocked `lists` route
// (fixtures.ts) returns 200 for any method other than POST without
// inspecting the body - sufficient here since useLists.ts's
// updateListName/setListArchived/deleteList never call `.select()` on
// their mutations, only checking for a request error before committing
// their already-applied optimistic local update.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

test.describe('Lists management', () => {
  test('renaming a list updates its displayed name', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { listName: 'הרשימה שלי', ownerId: USER_ID });

    await page.goto('/lists');
    await expect(page.getByText('הרשימה שלי')).toBeVisible();

    await page.getByRole('button', { name: 'אפשרויות רשימה' }).click();
    await page.getByRole('button', { name: 'שנה שם' }).click();

    const input = page.getByPlaceholder('שם הרשימה');
    await input.fill('רשימת קניות חדשה');
    await page.getByRole('button', { name: 'שמור' }).click();

    await expect(page.getByText('רשימת קניות חדשה')).toBeVisible();
    await expect(page.getByText('הרשימה שלי')).not.toBeVisible();
  });

  test('archiving a list moves it to the archived section, unarchiving moves it back', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { listName: 'רשימה לארכוב', ownerId: USER_ID });

    await page.goto('/lists');
    await expect(page.getByText('רשימה לארכוב')).toBeVisible();

    await page.getByRole('button', { name: 'אפשרויות רשימה' }).click();
    await page.getByRole('button', { name: 'העבר לארכיון' }).click();

    await expect(page.getByText('רשימות בארכיון')).toBeVisible();

    await page.getByRole('button', { name: 'אפשרויות רשימה' }).click();
    await page.getByRole('button', { name: 'הוצא מארכיון' }).click();

    await expect(page.getByText('רשימות בארכיון')).not.toBeVisible();
  });

  test('deleting a list (owner) removes it after confirmation', async ({ page }) => {
    await seedAuthSession(page);
    await mockListData(page, { listName: 'רשימה למחיקה', ownerId: USER_ID });

    await page.goto('/lists');
    await expect(page.getByText('רשימה למחיקה')).toBeVisible();

    await page.getByRole('button', { name: 'אפשרויות רשימה' }).click();
    await page.getByRole('button', { name: 'מחק רשימה' }).click();
    await expect(page.getByText('למחוק את הרשימה הזו?')).toBeVisible();
    await page.getByRole('button', { name: 'מחק לצמיתות' }).click();

    await expect(page.getByText('עדיין אין לך רשימות')).toBeVisible();
  });

  test('a non-owner member does not see the delete option', async ({ page }) => {
    await seedAuthSession(page);
    // The seeded auth user is USER_ID but the list's owner is someone else.
    await mockListData(page, { listName: 'רשימה משותפת', ownerId: 'e2e00003-owner-owner-owner-000000000003' });

    await page.goto('/lists');
    await page.getByRole('button', { name: 'אפשרויות רשימה' }).click();

    await expect(page.getByRole('button', { name: 'מחק רשימה' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'שנה שם' })).toBeVisible();
  });
});

test('switching between two lists updates the active list', async ({ page }) => {
  await seedAuthSession(page);

  const LIST_A = LIST_ID;
  const LIST_B = 'e2e0000-0000-0000-0000-000000000002';

  await mockListData(page, { listName: 'רשימה א', ownerId: USER_ID });
  // Registered after mockListData so it takes priority (Playwright
  // matches the most-recently-added route first) - overrides the
  // single-list default with two lists, to exercise switching.
  await page.route('**/rest/v1/lists*', (route) => {
    if (route.request().method() === 'POST') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: LIST_A,
          name: 'רשימה א',
          owner_id: USER_ID,
          created_at: new Date(Date.now() - 1000).toISOString(),
          archived: false,
          list_members: [{ count: 1 }],
          items: [{ count: 0 }],
        },
        {
          id: LIST_B,
          name: 'רשימה ב',
          owner_id: USER_ID,
          created_at: new Date().toISOString(),
          archived: false,
          list_members: [{ count: 1 }],
          items: [{ count: 0 }],
        },
      ]),
    });
  });

  await page.goto('/lists');
  await expect(page.getByText('רשימה א')).toBeVisible();
  await expect(page.getByText('רשימה ב')).toBeVisible();

  // The second list starts as non-active - select it.
  const rowB = page.locator('li', { hasText: 'רשימה ב' });
  await rowB.getByRole('button', { name: 'בחר' }).click();

  await expect(rowB.getByText('פעילה')).toBeVisible();
});
