// e2e/quantity-grouping.spec.ts
// Coverage for Phase 1's product-grouping feature (ShoppingList.tsx's
// clusterByName), which had zero automated coverage before this QA
// pass: identical-name items collapse into one "Nx" row.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

const CAT_VEG = 'e2e-cat-veg';

test('items with the same name are grouped into a single Nx row', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_VEG, list_id: LIST_ID, user_id: USER_ID, name: 'ירקות' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'בצל', is_done: false, position: 0 },
      { id: 'e2e-item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'בצל', is_done: false, position: 1 },
      { id: 'e2e-item-3', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'בצל', is_done: false, position: 2 },
      { id: 'e2e-item-4', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_VEG, name: 'גזר', is_done: false, position: 3 },
    ],
  });

  await page.goto('/');

  // "בצל" appears exactly once (as a single grouped row), not three times.
  await expect(page.getByText('בצל')).toHaveCount(1);
  await expect(page.getByText('3x')).toBeVisible();

  // A different name is never merged into the same group.
  await expect(page.getByText('גזר')).toBeVisible();
  await expect(page.getByText('1x')).toBeVisible();
});
