// e2e/share-link.spec.ts
// The real Share Link feature (create_invite_link / join_list_by_token
// / revoke_invite_link), covering both halves: generating/copying the
// link (owner side) and accepting it (joiner side, logged in and
// logged out). Same fully-mocked-REST approach as the rest of this
// suite - see e2e/fixtures.ts.
import { test, expect } from '@playwright/test';
import {
  mockListData,
  mockAuthEndpoints,
  mockCreateInviteLinkRpc,
  mockJoinListByTokenRpc,
  mockRevokeInviteLinkRpc,
  seedAuthSession,
  USER_ID,
  OTHER_USER_ID,
  LIST_ID,
  MOCK_INVITE_TOKEN,
} from './fixtures';

const REPLACEMENT_TOKEN = 'b2c3d4e5f6a1091827364554637281900aabbccddeeff11';

test.describe('Share Link - owner side', () => {
  test('the owner sees a real, per-list link, not a fixed mock code', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockCreateInviteLinkRpc(page);

    await page.goto('/family');
    const linkText = page.locator('p[dir="ltr"].font-mono').first();
    await expect(linkText).toContainText(`/invite/${MOCK_INVITE_TOKEN}`);
    await expect(linkText).not.toContainText('ABC123');
  });

  test('copying the link places the real URL on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockCreateInviteLinkRpc(page);

    await page.goto('/family');
    await page.getByRole('button', { name: 'העתקה' }).first().click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`/invite/${MOCK_INVITE_TOKEN}`);
  });

  test('a non-owner sees a friendly message instead of a link', async ({ page }) => {
    await seedAuthSession(page, OTHER_USER_ID, 'member@example.com');
    await mockListData(page, {
      ownerId: USER_ID,
      listMembers: [
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: LIST_ID, user_id: OTHER_USER_ID, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: OTHER_USER_ID, email: 'member@example.com' },
      ],
    });
    await mockCreateInviteLinkRpc(page, { errorCode: 'not_owner' });

    await page.goto('/family');
    await expect(page.getByText('רק בעל/ת הרשימה יכול/ה להזמין חברים')).toBeVisible();
    await expect(page.locator('p[dir="ltr"].font-mono')).toHaveCount(0);
  });

  test('revoking asks for confirmation, then generates a new link', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });

    // First create_invite_link call (on mount) returns the original
    // token; the one after revoke returns a different token - proves
    // the UI actually shows the replacement, not a stale cached value.
    let createCalls = 0;
    await page.route('**/rest/v1/rpc/create_invite_link', (route) => {
      createCalls += 1;
      const token = createCalls === 1 ? MOCK_INVITE_TOKEN : REPLACEMENT_TOKEN;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ token, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }]),
      });
    });
    await mockRevokeInviteLinkRpc(page);

    let confirmMessage = '';
    page.on('dialog', (dialog) => {
      confirmMessage = dialog.message();
      dialog.accept();
    });

    await page.goto('/family');
    const linkText = page.locator('p[dir="ltr"].font-mono').first();
    await expect(linkText).toContainText(`/invite/${MOCK_INVITE_TOKEN}`);

    await page.getByRole('button', { name: 'ביטול הקישור' }).click();

    // A native confirm() was actually shown (not skipped), and only
    // after accepting it did revoke_invite_link get called.
    await expect.poll(() => confirmMessage).not.toBe('');
    await expect(linkText).toContainText(`/invite/${REPLACEMENT_TOKEN}`);
    await expect(linkText).not.toContainText(MOCK_INVITE_TOKEN);
    expect(createCalls).toBe(2);
  });
});

test.describe('Share Link - accepting (logged in)', () => {
  test('a valid link joins the list and redirects home', async ({ page }) => {
    await seedAuthSession(page, OTHER_USER_ID, 'joiner@example.com');
    await mockListData(page);
    await mockJoinListByTokenRpc(page);

    await page.goto(`/invite/${MOCK_INVITE_TOKEN}`);
    await expect(page.getByText('הצטרפת בהצלחה')).toBeVisible();
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('re-visiting a link you already used shows a graceful message, not an error', async ({ page }) => {
    await seedAuthSession(page, OTHER_USER_ID, 'joiner@example.com');
    await mockListData(page);
    await mockJoinListByTokenRpc(page, { errorCode: 'already_member' });

    await page.goto(`/invite/${MOCK_INVITE_TOKEN}`);
    await expect(page.getByText('כבר יש לך גישה')).toBeVisible();
    await expect(page.getByText('את/ה כבר חבר/ה ברשימה הזו')).toBeVisible();
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('an invalid token shows a graceful error with a way back', async ({ page }) => {
    await seedAuthSession(page, OTHER_USER_ID, 'joiner@example.com');
    await mockListData(page);
    await mockJoinListByTokenRpc(page, { errorCode: 'invalid_link' });

    await page.goto('/invite/not-a-real-token');
    await expect(page.getByText('לא ניתן להצטרף')).toBeVisible();
    await expect(page.getByText('קישור ההזמנה לא תקין')).toBeVisible();

    await page.getByRole('button', { name: 'חזרה לרשימה שלי' }).click();
    await expect(page).toHaveURL('/');
  });

  test('a revoked link shows a graceful, specific error', async ({ page }) => {
    await seedAuthSession(page, OTHER_USER_ID, 'joiner@example.com');
    await mockListData(page);
    await mockJoinListByTokenRpc(page, { errorCode: 'revoked_link' });

    await page.goto(`/invite/${MOCK_INVITE_TOKEN}`);
    await expect(page.getByText('קישור ההזמנה הזה כבר לא פעיל')).toBeVisible();
  });

  test('an expired link shows a graceful, specific error', async ({ page }) => {
    await seedAuthSession(page, OTHER_USER_ID, 'joiner@example.com');
    await mockListData(page);
    await mockJoinListByTokenRpc(page, { errorCode: 'expired_link' });

    await page.goto(`/invite/${MOCK_INVITE_TOKEN}`);
    await expect(page.getByText('קישור ההזמנה הזה פג תוקף')).toBeVisible();
  });
});

test.describe('Share Link - accepting (logged out)', () => {
  test('a logged-out visitor is sent to log in, then bounced back to the same invite link', async ({ page }) => {
    await mockAuthEndpoints(page, { loginOk: true, email: 'joiner@example.com' });
    await mockListData(page);
    await mockJoinListByTokenRpc(page);

    await page.goto(`/invite/${MOCK_INVITE_TOKEN}`);
    await expect(page).toHaveURL('/login');

    await page.locator('input[type="email"]').fill('joiner@example.com');
    await page.locator('input[type="password"]').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /התחבר|Log in|Sign in/i }).click();

    // Bounced back to the invite, not the default shopping list -
    // this is the whole point of postLoginRedirect.ts.
    await expect(page.getByText('הצטרפת בהצלחה')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('a malicious stored redirect value is never honored (open redirect guard)', async ({ page }) => {
    await mockAuthEndpoints(page, { email: 'joiner@example.com' });
    await mockListData(page);

    // Simulates a stray/tampered sessionStorage value that doesn't
    // match postLoginRedirect.ts's SAFE_PATH pattern (/^\/invite\/[^/]+$/) -
    // e.g. an attempted external or path-traversal target. Seeded
    // directly rather than via page.goto(), since the browser itself
    // normalizes an actual URL like "/invite/../evil.com" before this
    // app's code ever sees it - this is the precise, realistic case
    // getAndClearPostLoginRedirect() itself is responsible for
    // rejecting.
    await page.addInitScript(() => {
      sessionStorage.setItem('shopping-list:postLoginRedirect', 'https://evil.example.com');
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('joiner@example.com');
    await page.locator('input[type="password"]').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /התחבר|Log in|Sign in/i }).click();

    // Must land on the ordinary default route, never the malicious value.
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('a stored redirect with an extra path segment is rejected too', async ({ page }) => {
    await mockAuthEndpoints(page, { email: 'joiner@example.com' });
    await mockListData(page);

    await page.addInitScript(() => {
      sessionStorage.setItem('shopping-list:postLoginRedirect', '/invite/abc/../../admin');
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('joiner@example.com');
    await page.locator('input[type="password"]').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /התחבר|Log in|Sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});
