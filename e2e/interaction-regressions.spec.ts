// e2e/interaction-regressions.spec.ts
// Targeted coverage for three items on the final QA regression
// checklist that had no automated coverage before this pass: swipe
// delete, category collapse/expand, and a basic mobile-viewport smoke
// check. Swipe delete in particular is worth having as a real
// regression test - it's exactly the code path where a pointer-capture
// bug was found and fixed during this QA round (see
// FINAL_QA_REPORT.md), so a drag that never gets simulated here would
// leave that fix unguarded against a future regression.
import { test, expect, devices } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

const CAT_DAIRY = 'e2e-cat-dairy';

test('swiping a row past the delete threshold removes the item', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'גבינה צהובה', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  await expect(page.getByText('גבינה צהובה')).toBeVisible();

  const row = page.locator('li', { hasText: 'גבינה צהובה' });
  const box = await row.boundingBox();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  // A real drag (multiple intermediate steps, not a single jump) past
  // MAX_DRAG_PX / DELETE_THRESHOLD_PX in ItemCard.tsx.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(startX + i * 25, startY, { steps: 2 });
  }
  await page.mouse.up();

  // Scoped to the row itself (not a page-wide text search): the new
  // UndoSnackbar (added alongside this swipe-to-delete UX) shows a
  // "{item} נמחק" toast after delete, which also contains the item's
  // name - a page.getByText() substring match would ambiguously match
  // that toast too, even though the actual row is gone.
  await expect(row).toHaveCount(0);
});

test('a plain tap on the checkbox still toggles - not swallowed by swipe handling', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'toggle item' }).click();
  await expect(page.getByText('חלב 3%')).toHaveClass(/line-through/);
});

test('category sections collapse and expand', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  await expect(page.getByText('חלב 3%')).toBeVisible();

  // The CategorySection header's accessible name is "<category name> <count>" -
  // exact match to avoid the same category name also matching the
  // filter chip and the quick-add category selector on this page.
  const sectionHeader = page.getByRole('button', { name: 'מוצרי חלב 1', exact: true });

  // The collapsible region is a CSS grid-rows (0fr/1fr) + overflow-hidden
  // technique (CategorySection.tsx) so the animation can be smooth - its
  // children keep a non-empty layout box even while genuinely clipped to
  // zero visual height, which Playwright's toBeVisible() doesn't treat
  // as hidden. Assert on the actual mechanism (aria-hidden + collapsed
  // height) instead, and confirm visually via a screenshot-verified
  // bounding-box check.
  const collapsibleRegion = sectionHeader.locator('xpath=following-sibling::div[1]');

  await sectionHeader.click();
  await expect(collapsibleRegion).toHaveAttribute('aria-hidden', 'true');
  await page.waitForTimeout(250); // let the 200ms collapse transition finish
  expect((await collapsibleRegion.boundingBox())?.height ?? 0).toBeLessThan(2);

  await sectionHeader.click();
  await expect(collapsibleRegion).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByText('חלב 3%')).toBeVisible();
});

test('renders without horizontal overflow on a small mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone SE'] });
  const page = await context.newPage();

  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  await expect(page.getByText('חלב 3%')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBe(false);

  await context.close();
});
