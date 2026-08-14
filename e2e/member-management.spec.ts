// e2e/member-management.spec.ts
// Coverage for the Family Members screen's remove-member action: who
// sees it, the confirmation step, and the immediate (no-refresh) local
// update on success vs. the rollback-and-error on failure. Invitation
// coverage itself lives in e2e/invite.spec.ts - unaffected by any of
// this and not duplicated here.
import { test, expect } from '@playwright/test';
import { mockListData, seedAuthSession, USER_ID, LIST_ID } from './fixtures';

const REMOVE_BUTTON_LABEL = 'הסר חבר';

// FamilyHeroCard's MemberAvatarGroup also renders each member's email
// in a hover tooltip span - a plain page.getByText(email) ambiguously
// matches that too. The member row's own email lives in a
// span[dir="ltr"] (see FamilyMembers.tsx), which the tooltip isn't -
// scoping to that disambiguates without depending on layout/design.
function emailLocator(page: import('@playwright/test').Page, email: string) {
  return page.locator('span[dir="ltr"]', { hasText: email });
}

test.describe('Member Management', () => {
  test('the owner\'s own row never shows a remove action, even when their own list_members role is stale, and it does show for other members', async ({ page }) => {
    const memberId = 'e2e00004-4444-4444-4444-444444444444';
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      ownerId: USER_ID, // the real, authoritative owner
      listMembers: [
        // Deliberately stale role on the owner's own row - same
        // regression shape as the Invite by Email bug: lists.owner_id
        // (above) is what actually makes USER_ID the owner, not this.
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'member', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: LIST_ID, user_id: memberId, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: memberId, email: 'member@example.com' },
      ],
    });

    await page.goto('/family');
    await expect(emailLocator(page, 'owner@example.com')).toBeVisible();
    await expect(emailLocator(page, 'member@example.com')).toBeVisible();

    // Exactly one remove button on the whole page - the other member's,
    // never the owner's own row's.
    await expect(page.getByRole('button', { name: REMOVE_BUTTON_LABEL })).toHaveCount(1);

    // Scoped specifically to the owner's own row (nearest ancestor
    // carrying the row's own layout classes), not just "somewhere on
    // the page" - same xpath-ancestor convention already used in
    // e2e/dev-console-live.spec.ts for a SliderRow.
    const ownerRow = emailLocator(page, 'owner@example.com').locator('xpath=ancestor::div[contains(@class, "items-center") and contains(@class, "px-4")][1]');
    await expect(ownerRow.getByRole('button', { name: REMOVE_BUTTON_LABEL })).toHaveCount(0);
  });

  test('clicking remove shows a confirmation naming the member by email; cancelling makes no request and no UI change', async ({ page }) => {
    const memberId = 'e2e00005-5555-5555-5555-555555555555';
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      ownerId: USER_ID,
      listMembers: [
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: LIST_ID, user_id: memberId, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: memberId, email: 'removeme@example.com' },
      ],
    });

    let deleteCalls = 0;
    await page.route('**/rest/v1/list_members*', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      deleteCalls += 1;
      return route.fulfill({ status: 204, body: '' });
    });

    let confirmMessage = '';
    page.on('dialog', (dialog) => {
      confirmMessage = dialog.message();
      dialog.dismiss();
    });

    await page.goto('/family');
    await expect(emailLocator(page, 'removeme@example.com')).toBeVisible();

    await page.getByRole('button', { name: REMOVE_BUTTON_LABEL }).click();

    await expect.poll(() => confirmMessage).not.toBe('');
    expect(confirmMessage).toContain('removeme@example.com');

    await page.waitForTimeout(300);
    expect(deleteCalls).toBe(0);
    await expect(emailLocator(page, 'removeme@example.com')).toBeVisible();
  });

  test('confirming remove performs the removal and the member disappears immediately, with no page refresh', async ({ page }) => {
    const memberId = 'e2e00006-6666-6666-6666-666666666666';
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      ownerId: USER_ID,
      listMembers: [
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: LIST_ID, user_id: memberId, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: memberId, email: 'removeme@example.com' },
      ],
    });

    let deleteCalls = 0;
    await page.route('**/rest/v1/list_members*', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      deleteCalls += 1;
      return route.fulfill({ status: 204, body: '' });
    });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/family');
    await expect(emailLocator(page, 'removeme@example.com')).toBeVisible();

    await page.getByRole('button', { name: REMOVE_BUTTON_LABEL }).click();

    // Gone right away - no page.reload(), no re-navigation.
    await expect(emailLocator(page, 'removeme@example.com')).toHaveCount(0);
    expect(deleteCalls).toBe(1);
    await expect(page.getByRole('button', { name: REMOVE_BUTTON_LABEL })).toHaveCount(0);
  });

  test('a failed removal keeps the member visible and shows an error, not a silent failure', async ({ page }) => {
    const memberId = 'e2e00007-7777-7777-7777-777777777777';
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      ownerId: USER_ID,
      listMembers: [
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: LIST_ID, user_id: memberId, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: memberId, email: 'removeme@example.com' },
      ],
    });

    await page.route('**/rest/v1/list_members*', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'simulated failure', code: '42501' }),
      });
    });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/family');
    await expect(emailLocator(page, 'removeme@example.com')).toBeVisible();

    await page.getByRole('button', { name: REMOVE_BUTTON_LABEL }).click();

    // Still there - the optimistic removal was rolled back.
    await expect(emailLocator(page, 'removeme@example.com')).toBeVisible();
    await expect(page.getByText('הסרת החבר/ה נכשלה. נסו שוב.')).toBeVisible();
  });
});
