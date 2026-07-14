// e2e/invite.spec.ts
import { test, expect } from '@playwright/test';
import { mockListData, mockInviteRpc, seedAuthSession, USER_ID } from './fixtures';

test.describe('Invite Member', () => {
  test('the list owner can invite a member by email', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockListData(page, {
      listMembers: [{ id: 'lm1', list_id: 'e2e0000-0000-0000-0000-000000000001', user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
      profiles: [{ id: USER_ID, email: 'owner@example.com' }],
    });
    await mockInviteRpc(page);

    await page.goto('/family');
    await expect(page.locator('p.font-semibold', { hasText: 'owner@example.com' })).toBeVisible();

    await page.getByText('הזמן חבר').click();
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

    await page.goto('/family');
    await page.getByText('הזמן חבר').click();
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
    await expect(page.getByText('הזמן חבר')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'הסר חבר' })).toHaveCount(0);
  });
});
