// e2e/dev-console-live.spec.ts
// Runs against the *other* build (see playwright.config.ts's second
// webServer/project: port 4174, VITE_ENABLE_DEV_SETTINGS=true) - the
// only spec file in this suite where the Developer Console is actually
// reachable. Everything else (e2e/dev-settings.spec.ts) deliberately
// runs against the standard build, where it's absent.
import { test, expect } from '@playwright/test';
import { seedAuthSession, mockListData, LIST_ID, USER_ID } from './fixtures';

const CAT_DAIRY = 'e2e-cat-dairy';

test('the Developer Console is reachable when VITE_ENABLE_DEV_SETTINGS=true', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');
  await expect(page.getByRole('heading', { name: 'Developer Console' })).toBeVisible();

  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  await expect(page.getByText('Developer Console')).toBeVisible();
});

test('changing revealThreshold applies immediately, and survives a client-side navigation with no page reload', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, {
    categories: [{ id: CAT_DAIRY, list_id: LIST_ID, user_id: USER_ID, name: 'מוצרי חלב' }],
    items: [
      { id: 'e2e-item-1', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'חלב 3%', is_done: false, position: 0 },
      { id: 'e2e-item-2', list_id: LIST_ID, user_id: USER_ID, category_id: CAT_DAIRY, name: 'קוטג׳', is_done: false, position: 1 },
    ],
  });

  await page.goto('/dev-settings');
  const numberInput = page.getByLabel('revealThreshold value');
  const rangeInput = page.getByLabel('revealThreshold slider');

  // Live update, no reload, within the console itself: the number
  // input and range slider are two independent DOM controls bound to
  // the same underlying store (useDeveloperConsole().swipe) - typing
  // into one updates the other instantly.
  await numberInput.fill('35');
  await numberInput.blur();
  await expect(rangeInput).toHaveValue('35');

  // Track navigation count to prove what follows is client-side
  // routing, not a fresh document load.
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });

  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  await page.getByRole('link', { name: 'רשימת קניות' }).click();
  await expect(page).toHaveURL('/');

  // A client-side route swap doesn't fire a real navigation event the
  // way page.goto()/a reload would - confirms no reload happened.
  expect(navigations.length).toBe(0);

  // Second row - the first plays a one-time auto entry-hint animation
  // (ItemCard.tsx's playEntryHint) that could otherwise race with this
  // test's own drag.
  const row = page.locator('[data-testid="item-row"]').nth(1);
  const box = await row.boundingBox();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 20, startY, { steps: 2 });
  await page.mouse.up();

  // Snaps open to the custom 35px set on the console page moments ago,
  // in a completely different mounted component (ItemCard, not
  // DeveloperConsole) - never reloaded in between.
  await expect(row).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 35, 0\)/);
});

test('settings persist after a real reload', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');
  await page.getByLabel('animationDuration value').fill('777');
  await page.getByLabel('animationDuration value').blur();

  await page.reload();
  await expect(page.getByLabel('animationDuration value')).toHaveValue('777');
});
