// e2e/dev-settings.spec.ts
// Coverage for the dev/QA-only Developer Console (src/devtools/) and
// its effect on business components (ItemCard.tsx's swipe-to-delete,
// InviteMemberModal.tsx's email invite). This suite always runs
// against a standard production build (no VITE_ENABLE_DEV_SETTINGS,
// import.meta.env.DEV false - see playwright.config.ts), so the first
// test doubles as the "hidden in production" verification: if the gate
// were ever broken open, this build would be the one to catch it.
// e2e/dev-console-live.spec.ts covers the opposite build (flag on) and
// actually drives the console's own UI.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, mockCreateInviteLinkRpc, LIST_ID, USER_ID } from './fixtures';

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
  await expect(page.getByText('Developer Console')).toHaveCount(0);

  // Also absent from the hamburger menu itself.
  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  await expect(page.getByText('Developer Console')).toHaveCount(0);
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

test('the automatic discovery hint reveals far enough for the delete icon to be genuinely visible, then returns to rest', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  // The FIRST row specifically - it's the only one that ever plays the
  // automatic entry hint (ItemCard.tsx's playEntryHint) at all.
  const row = page.locator('[data-testid="item-row"]').nth(0);
  const deleteButton = page.getByRole('button', { name: 'מחיקת פריט' });

  // The hint reveals to swipeSettings.revealThreshold (80px default) -
  // the exact position a real manual swipe snaps open to. The delete
  // icon is pinned to the panel's own left edge (not centered within
  // the full MAX_DRAG_PX-wide panel), so this reveal distance is
  // already enough to clear it.
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 80, 0\)/, { timeout: 1500 });

  // Geometry check: the delete button's bounding box must sit entirely
  // to the left of the row's now-shifted left edge - i.e. genuinely
  // uncovered, not merely technically "in the DOM" while still hidden
  // underneath the opaque white row.
  const rowBox = await row.boundingBox();
  const buttonBox = await deleteButton.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(rowBox!.x).toBeGreaterThanOrEqual(buttonBox!.x + buttonBox!.width);

  // Not just present in the DOM - genuinely opaque. revealProgress
  // (which drives the icon's opacity/scale) is min(1, translateX /
  // revealThreshold), which reaches exactly 1 at revealThreshold.
  const opacity = await deleteButton.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(opacity).toBeCloseTo(1, 1);

  // Settles back to the resting (closed) position once the hold
  // elapses - still a one-time hint, not left open.
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)/, { timeout: 2000 });
});

test('a custom discoveryHintHoldMs keeps the automatic discovery hint revealed for that long before it returns to rest', async ({ page }) => {
  await seedAuthSession(page);
  // A hold well above the 500ms default, so "still revealed at a point
  // past the default but within the custom value" actually distinguishes
  // this setting being honored from the hardcoded default being used.
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SWIPE_SETTINGS_KEY, value: JSON.stringify({ revealThreshold: 80, revealDuration: 180, autoCloseDelay: 0, animationDuration: 220, discoveryHintHoldMs: 1500 }) }
  );
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  const row = page.locator('[data-testid="item-row"]').nth(0);

  // Revealed after the fixed 500ms entry delay (unaffected by
  // discoveryHintHoldMs, which only controls how long it then stays
  // revealed).
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 80, 0\)/, { timeout: 1500 });

  // Still revealed well past the 500ms default hold (which would have
  // already returned to rest by now if the hardcoded default were still
  // in effect), proving the seeded 1500ms value is actually driving the
  // hold - not just the reveal distance.
  await page.waitForTimeout(700);
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 80, 0\)/);

  // Settles back to rest once the full custom hold elapses.
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)/, { timeout: 2000 });
});

const FEATURE_FLAGS_KEY = 'dev-settings:featureFlags';

// Regression guard: InviteMemberModal briefly had an enableEmailInvite
// dev-console feature flag gating this section (removed - see
// ROOT_CAUSE_REPORT_EMAIL_INVITE_RUNTIME.md and the restoration commit
// on this branch). Email Invite is a core, always-on feature - it must
// render unconditionally, and specifically must NOT be controllable by
// any stray/stale localStorage value under the old (now-unused)
// dev-settings:featureFlags key.
test('Email Invite always renders alongside Share Link, even with a stale featureFlags override in storage', async ({ page }) => {
  await seedAuthSession(page);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: FEATURE_FLAGS_KEY, value: JSON.stringify({ enableEmailInvite: false }) }
  );
  await mockListData(page, { categories: [], items: [] });
  await mockCreateInviteLinkRpc(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'הזמן חבר' }).click();

  await expect(page.getByText('קישור הזמנה למשפחה')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.getByText('הזמנה באימייל')).toBeVisible();
  await expect(page.getByRole('button', { name: /הוסף\/י/ })).toBeVisible();
});

test('disabling the Enable Swipe Delete flag replaces swipe with a plain delete button', async ({ page }) => {
  await seedAuthSession(page);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: FEATURE_FLAGS_KEY, value: JSON.stringify({ enableSwipeDelete: false }) }
  );
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
    ],
  });

  await page.goto('/');
  // No swipe machinery mounted at all with the flag off - the row has
  // no data-testid="item-row" wrapper (see ItemCard.tsx's dedicated
  // branch for this), only a plain delete button.
  await expect(page.locator('[data-testid="item-row"]')).toHaveCount(0);
  const deleteButton = page.getByRole('button', { name: 'מחיקת פריט' });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  // Scoped to the delete button itself, not a page-wide text search:
  // the Undo snackbar (enableUndoSnackbar defaults to true here) shows
  // "{item} נמחק", which also contains the item's name - see the same
  // fix already applied in interaction-regressions.spec.ts.
  await expect(deleteButton).toHaveCount(0);
});

test('disabling the Enable Demo Mode flag (renamed from Enable Demo Animation) skips straight to the empty state', async ({ page }) => {
  await seedAuthSession(page);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: FEATURE_FLAGS_KEY, value: JSON.stringify({ enableDemoMode: false }) }
  );
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/');
  // With the flag on (the default), DemoItemRow's fixed "חלב 3%" demo
  // label would render first and only fade to this real empty state
  // after its own animation finishes. With it off, this appears right away.
  await expect(page.getByText('הרשימה ריקה')).toBeVisible();
});
