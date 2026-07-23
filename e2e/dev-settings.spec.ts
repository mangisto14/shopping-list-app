// e2e/dev-settings.spec.ts
// Coverage for the dev/QA-only Developer Settings screen
// (src/pages/DevSettings.tsx, src/config/devSettings.ts) and its effect
// on ItemCard.tsx's swipe-to-delete behavior. This suite always runs
// against a standard production build (no VITE_ENABLE_DEV_SETTINGS,
// import.meta.env.DEV false - see playwright.config.ts), so the first
// test doubles as the "hidden in production" verification: if the gate
// were ever broken open, this build would be the one to catch it.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

const CAT_DAIRY = 'e2e-cat-dairy';
const SWIPE_SETTINGS_KEY = 'dev-settings:swipe';

test('the dev-settings route and menu entry are absent from a production build', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  // Direct navigation to the route falls through App.tsx's catch-all
  // (the route is never registered at all in this build - see
  // isDevSettingsEnabled() in App.tsx) and lands back on the shopping
  // list, not some broken/blank dev screen.
  await page.goto('/dev-settings');
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Developer Settings')).toHaveCount(0);

  // Also absent from the hamburger menu itself.
  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  await expect(page.getByText('Developer Settings')).toHaveCount(0);
});

test('a custom revealThreshold from dev settings changes where a partial swipe snaps open', async ({ page }) => {
  await seedAuthSession(page);
  // Seeded before the app's first script runs, exactly like
  // seedAuthSession does for the auth session - useSwipeSettings()
  // reads this on mount, no UI interaction with the (unreachable, in
  // this build) settings screen required.
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SWIPE_SETTINGS_KEY, value: JSON.stringify({ revealThreshold: 40, revealDuration: 180, autoCloseDelay: 0, animationDuration: 220 }) }
  );
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
      { id: 'e2e-item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'קוטג׳', is_done: false, position: 1 },
    ],
  });

  await page.goto('/');
  // Second row specifically - the first gets a one-time auto-playing
  // "entry hint" swipe animation (ItemCard.tsx's playEntryHint) that
  // would otherwise race with and clobber this test's own drag.
  const row = page.locator('[data-testid="item-row"]').nth(1);
  const box = await row.boundingBox();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  // A short drag - past the default REVEAL_PX/2 (40px) but nowhere
  // near the (unconfigurable) delete threshold - that only counts as
  // "open" under the custom, smaller revealThreshold seeded above.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 25, startY, { steps: 2 });
  await page.mouse.up();

  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 40, 0\)/);
});

test('a custom autoCloseDelay from dev settings closes an open row on its own', async ({ page }) => {
  await seedAuthSession(page);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SWIPE_SETTINGS_KEY, value: JSON.stringify({ revealThreshold: 80, revealDuration: 50, autoCloseDelay: 400, animationDuration: 220 }) }
  );
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
      { id: 'e2e-item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'קוטג׳', is_done: false, position: 1 },
    ],
  });

  await page.goto('/');
  // Second row - see the comment in the revealThreshold test above.
  const row = page.locator('[data-testid="item-row"]').nth(1);
  const box = await row.boundingBox();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 50, startY, { steps: 2 });
  await page.mouse.up();

  // Open (revealed, not deleted): translateX sits at revealThreshold.
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 80, 0\)/);

  // Left untouched past autoCloseDelay (400ms) - the row closes itself,
  // with no further tap/interaction.
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)/, { timeout: 2000 });
});
