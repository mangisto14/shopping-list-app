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

  // The menu overlays on top of the still-mounted page underneath (the
  // page itself doesn't unmount), so both the heading and the menu's
  // own link end up in the DOM together - target the link specifically
  // rather than an ambiguous page-wide text search.
  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  await expect(page.getByRole('link', { name: 'Developer Console' })).toBeVisible();
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
  const numberInput = page.getByLabel('Reveal Threshold value');
  const rangeInput = page.getByLabel('Reveal Threshold slider');

  // Live update, no reload, within the console itself: the number
  // input and range slider are two independent DOM controls bound to
  // the same underlying store (useDevTools().swipe) - typing into one
  // updates the other instantly.
  await numberInput.fill('35');
  await numberInput.blur();
  await expect(rangeInput).toHaveValue('35');

  // A marker in the live JS context, not a navigation-event count:
  // Playwright's `framenavigated` fires for client-side History API
  // route changes too, not just real document loads, so it can't tell
  // them apart. A real reload creates a fresh window/JS context and
  // would wipe this; a client-side route swap (same document) can't.
  await page.evaluate(() => {
    (window as unknown as { __e2eMarker: string }).__e2eMarker = 'still-here';
  });

  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  await page.getByRole('link', { name: 'רשימת קניות' }).click();
  await expect(page).toHaveURL('/');

  // The nav menu (a Headless UI Popover) doesn't close itself just
  // because an internal <Link> was clicked and the route changed
  // underneath it - it only closes on an outside click, the toggle
  // button, or Escape. Left as-is, its still-open (fully opaque,
  // absolutely positioned, z-10) panel keeps intercepting pointer
  // events for whatever now renders underneath its screen area.
  // Escape reliably closes it, and its `transition` prop then
  // unmounts the panel once the close animation finishes.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'רשימת קניות' })).toHaveCount(0);

  expect(await page.evaluate(() => (window as unknown as { __e2eMarker?: string }).__e2eMarker)).toBe('still-here');

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
  await page.getByLabel('Animation Duration value').fill('777');
  await page.getByLabel('Animation Duration value').blur();

  await page.reload();
  await expect(page.getByLabel('Animation Duration value')).toHaveValue('777');
});

test('new sections (Appearance, Network Simulation, Mock Data) render; removed sections do not', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');

  await page.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Direction' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();

  await page.getByRole('button', { name: 'Network Simulation' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Network Mode' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Disable Realtime' })).toBeVisible();

  await page.getByRole('button', { name: 'Mock Data' }).click();
  await expect(page.getByRole('button', { name: 'Create Demo Shopping List' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Demo Categories' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Demo Family' })).toBeVisible();

  // Removed for this release - destructive DB operations and the
  // performance monitor are gone from the codebase entirely, not just
  // hidden behind a toggle.
  await expect(page.getByText('Database Utilities')).toHaveCount(0);
  await expect(page.getByText('Performance', { exact: false })).toHaveCount(0);
  await expect(page.getByText('FPS')).toHaveCount(0);
  await expect(page.getByText('Render Count')).toHaveCount(0);
});

test('search filters to matching rows, and Favorites only isolates pinned settings', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');

  await page.getByPlaceholder('Search settings…').fill('haptics');
  await expect(page.getByRole('switch', { name: 'Haptics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Swipe Settings' })).toHaveCount(0);
  await page.getByPlaceholder('Search settings…').fill('');

  // Pin "Haptics" specifically (Swipe Settings is also expanded by
  // default and has its own pin buttons, so this can't just grab the
  // first pin button on the page), then isolate to favorites only -
  // every other section (which has nothing pinned) should disappear.
  await page.getByRole('button', { name: 'Feature Flags' }).click();
  const hapticsRow = page.getByRole('switch', { name: 'Haptics' }).locator('xpath=ancestor::div[contains(@class, "justify-between")][1]');
  await hapticsRow.getByRole('button', { name: 'Pin to favorites' }).click();
  await page.getByRole('button', { name: /Favorites only/ }).click();

  await expect(page.getByRole('switch', { name: 'Haptics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Environment' })).toHaveCount(0);
});

test('resetting a single field only affects that field', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');

  await page.getByLabel('Reveal Threshold value').fill('150');
  await page.getByLabel('Reveal Duration value').fill('900');

  // Nearest ancestor div carrying SliderRow's own root class (not some
  // larger outer container that also "has" this input as a descendant).
  const revealThresholdRow = page.getByLabel('Reveal Threshold value').locator('xpath=ancestor::div[contains(@class, "space-y-2")][1]');
  await revealThresholdRow.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByLabel('Reveal Threshold value')).toHaveValue('80'); // back to default
  await expect(page.getByLabel('Reveal Duration value')).toHaveValue('900'); // untouched
});

test('Discovery Hint Hold Duration: appears in the console with a 500ms default, live-updates, persists after reload, and Reset restores it', async ({ page }) => {
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');

  // Requirement 2 (console displays the setting) + requirement 1
  // (default value is 500ms) in one check.
  const numberInput = page.getByLabel('Discovery Hint Hold Duration value');
  const rangeInput = page.getByLabel('Discovery Hint Hold Duration slider');
  await expect(numberInput).toHaveValue('500');
  await expect(rangeInput).toHaveValue('500');

  // Live update, same two-way-bound number/range pair as every other
  // SliderRow (see the revealThreshold live-update test above).
  await numberInput.fill('1200');
  await numberInput.blur();
  await expect(rangeInput).toHaveValue('1200');

  // Requirement 3: persists using the same SwipeSettings/localStorage
  // mechanism as the other swipe settings, verified with a real reload.
  await page.reload();
  await expect(page.getByLabel('Discovery Hint Hold Duration value')).toHaveValue('1200');

  // Reset control: restores just this field, same pattern as the
  // revealThreshold/revealDuration test above.
  const holdRow = page.getByLabel('Discovery Hint Hold Duration value').locator('xpath=ancestor::div[contains(@class, "space-y-2")][1]');
  await holdRow.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Discovery Hint Hold Duration value')).toHaveValue('500');
});

test('the open nav menu stacks above Developer Console page content (z-index regression)', async ({ page }) => {
  // Reproduces on a narrow/mobile viewport: at the default desktop
  // width the menu panel and the console's settings rows don't share
  // any screen space, so the stacking bug never gets a chance to show.
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAuthSession(page);
  await mockListData(page, { categories: [], items: [] });

  await page.goto('/dev-settings');
  await page.getByRole('button', { name: 'תפריט ניווט' }).click();
  const menuLink = page.getByRole('link', { name: 'Developer Console' });
  await expect(menuLink).toBeVisible();

  // The menu panel itself (Popover's rounded-3xl white card), not just
  // one link inside it - this is what needs a reliable stacking level
  // above the page content it visually covers.
  const menuPanel = page.locator('.rounded-3xl.bg-white').first();
  const panelBox = await menuPanel.boundingBox();
  expect(panelBox).not.toBeNull();

  // The Developer Console's own sticky search/filter bar (directly
  // above the Swipe Settings section, visible right under the open
  // menu at this viewport size) is the control that actually escaped
  // above the menu: `position: sticky` plus an explicit z-index makes
  // it establish its own stacking context, previously tied with the
  // menu panel's z-index and winning the tie-break on later DOM order.
  const searchBar = page.getByPlaceholder('Search settings…');
  const searchBarBox = await searchBar.boundingBox();
  expect(searchBarBox).not.toBeNull();

  // Sanity check that this test actually exercises the overlap: if a
  // future layout change moves these two out of each other's way, this
  // assertion (not the elementFromPoint check below) is what fails,
  // making that obvious instead of the test silently passing for the
  // wrong reason.
  const overlaps =
    searchBarBox!.x < panelBox!.x + panelBox!.width &&
    searchBarBox!.x + searchBarBox!.width > panelBox!.x &&
    searchBarBox!.y < panelBox!.y + panelBox!.height &&
    searchBarBox!.y + searchBarBox!.height > panelBox!.y;
  expect(overlaps).toBe(true);

  // At the overlap coordinate, the menu must be what actually paints on
  // top - not the sticky search bar underneath it.
  const x = searchBarBox!.x + searchBarBox!.width / 2;
  const y = searchBarBox!.y + searchBarBox!.height / 2;
  const topElementIsInsideMenu = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest('.rounded-3xl.bg-white');
    },
    { x, y }
  );
  expect(topElementIsInsideMenu).toBe(true);

  // Closing the menu leaves the Swipe Settings control exactly as it
  // was - unchanged value, still interactive - confirming the fix only
  // touched stacking, not the control itself.
  await page.keyboard.press('Escape');
  await expect(menuLink).toHaveCount(0);

  const numberInput = page.getByLabel('Reveal Threshold value');
  const rangeInput = page.getByLabel('Reveal Threshold slider');
  await expect(numberInput).toHaveValue('80');
  await numberInput.fill('95');
  await numberInput.blur();
  await expect(rangeInput).toHaveValue('95');
});
