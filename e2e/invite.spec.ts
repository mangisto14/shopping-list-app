// e2e/invite.spec.ts
import { test, expect } from '@playwright/test';
import { mockListData, mockInviteRpc, mockCreateInviteLinkRpc, seedAuthSession, USER_ID, LIST_ID } from './fixtures';

test.describe('Invite Member', () => {
  test('the list owner can invite a member by email', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockInviteRpc(page);
    await mockCreateInviteLinkRpc(page);

    await page.goto('/family');
    await expect(page.locator('p.font-semibold', { hasText: 'owner@example.com' })).toBeVisible();

    // FamilyMembers.tsx's invite trigger lives inside FamilyHeroCard now,
    // labeled "הזמנת בן משפחה" - "הזמן חבר" was the pre-redesign copy and
    // no longer exists anywhere on the page.
    await page.getByText('הזמנת בן משפחה').click();
    await page.locator('input[type="email"]').fill('newmember@example.com');
    await page.getByRole('button', { name: /הוסף\/י/ }).click();

    await expect(page.getByText('נוסף/ה לרשימה')).toBeVisible();
  });

  test('inviting a non-existent user shows a friendly error', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockInviteRpc(page, { errorCode: 'user_not_found' });
    await mockCreateInviteLinkRpc(page);

    await page.goto('/family');
    // FamilyMembers.tsx's invite trigger lives inside FamilyHeroCard now,
    // labeled "הזמנת בן משפחה" - "הזמן חבר" was the pre-redesign copy and
    // no longer exists anywhere on the page.
    await page.getByText('הזמנת בן משפחה').click();
    await page.locator('input[type="email"]').fill('nobody@example.com');
    await page.getByRole('button', { name: /הוסף\/י/ }).click();

    await expect(page.getByText('לא נמצא משתמש/ת')).toBeVisible();
  });

  test('a non-owner member does not see invite or remove controls', async ({ page }) => {
    const memberId = 'e2e00002-2222-2222-2222-222222222222';
    await seedAuthSession(page, memberId, 'member@example.com');
    await mockListData(page, {
      ownerId: USER_ID,
      listMembers: [
        { id: 'lm1', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: memberId, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: memberId, email: 'member@example.com' },
      ],
    });

    await page.goto('/family');
    await expect(page.locator('p.font-semibold', { hasText: 'owner@example.com' })).toBeVisible();
    // Was asserting against "הזמן חבר", a string that no longer exists
    // anywhere on the page regardless of role - that made this a false
    // positive that never actually verified the invite button was
    // hidden from non-owners. Fixed the real bug (FamilyHeroCard.tsx
    // wasn't gating the invite button on `isOwner` at all) and this now
    // asserts against the button's real, current label.
    await expect(page.getByText('הזמנת בן משפחה')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'הסר חבר' })).toHaveCount(0);
  });

  test('the list owner sees Invite by Email and the invitation-link controls on the shopping list page', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockCreateInviteLinkRpc(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'הזמן חבר' }).click();

    await expect(page.getByText('קישור הזמנה למשפחה')).toBeVisible();
    await expect(page.getByText('הזמנה באימייל')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('a non-owner member does not see the invite button, Invite by Email, or the invitation-link controls on the shopping list page', async ({ page }) => {
    const memberId = 'e2e00003-3333-3333-3333-333333333333';
    await seedAuthSession(page, memberId, 'member@example.com');
    await mockListData(page, {
      ownerId: USER_ID,
      listMembers: [
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() },
        { id: 'lm2', list_id: LIST_ID, user_id: memberId, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [
        { id: USER_ID, email: 'owner@example.com' },
        { id: memberId, email: 'member@example.com' },
      ],
    });

    await page.goto('/');

    // The header's invite trigger (aria-label "הזמן חבר") must not be
    // rendered at all for a non-owner - not just disabled - so there is
    // no way to even open the modal that contains "Invite by Email" and
    // the invitation-link controls.
    await expect(page.getByRole('button', { name: 'הזמן חבר' })).toHaveCount(0);
    await expect(page.getByText('הזמנה באימייל')).toHaveCount(0);
    await expect(page.getByText('קישור הזמנה למשפחה')).toHaveCount(0);

    // Retains normal access to the shared list itself.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  // Regression test for the "owner can't see Invite by Email" bug:
  // create_default_list_for_user() used to insert the owner's own
  // list_members row without a role, silently defaulting to 'member'
  // (fixed going forward in 20260723120000_fix_default_list_owner_role.sql,
  // but never backfilled onto rows that already existed) - so a real
  // owner's own list_members.role can still say 'member' today.
  // useMembers().isOwner must not rely on that column alone.
  test('the real owner still sees Invite by Email even when their own list_members row has a stale role of "member"', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      ownerId: USER_ID, // lists.owner_id - the actual, authoritative owner
      listMembers: [
        // Deliberately wrong/stale role - lists.owner_id (above) is what
        // makes USER_ID the real owner, not this row's role column.
        { id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'member', joined_at: new Date().toISOString() },
      ],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockCreateInviteLinkRpc(page);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'הזמן חבר' })).toBeVisible();
    await page.getByRole('button', { name: 'הזמן חבר' }).click();
    await expect(page.getByText('הזמנה באימייל')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
