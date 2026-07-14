// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { mockAuthEndpoints, mockListData, seedAuthSession, USER_ID } from './fixtures';

test.describe('Register', () => {
  test('successful registration navigates to the shopping list', async ({ page }) => {
    await mockAuthEndpoints(page, { signUpOk: true });
    await mockListData(page);

    await page.goto('/register');
    await page.locator('input[type="email"]').fill('newuser@example.com');
    await page.locator('input[type="password"]').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /הרשם|Sign up/i }).click();

    await expect(page).toHaveURL('/');
  });

  test('a duplicate email shows a friendly error, not raw SDK text', async ({ page }) => {
    await mockAuthEndpoints(page, { signUpOk: false });
    await mockListData(page);

    await page.goto('/register');
    await page.locator('input[type="email"]').fill('existing@example.com');
    await page.locator('input[type="password"]').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /הרשם|Sign up/i }).click();

    const error = page.locator('p.text-red-500');
    await expect(error).toBeVisible();
    await expect(error).not.toContainText('User already registered');
    await expect(page).toHaveURL('/register');
  });
});

test.describe('Login', () => {
  test('successful login navigates to the shopping list', async ({ page }) => {
    await mockAuthEndpoints(page, { loginOk: true });
    await mockListData(page);

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('owner@example.com');
    await page.locator('input[type="password"]').fill('correct-password');
    await page.getByRole('button', { name: /התחבר|Log In/i }).click();

    await expect(page).toHaveURL('/');
  });

  test('wrong credentials show a friendly error, not raw SDK text', async ({ page }) => {
    await mockAuthEndpoints(page, { loginOk: false });
    await mockListData(page);

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('owner@example.com');
    await page.locator('input[type="password"]').fill('wrong-password');
    await page.getByRole('button', { name: /התחבר|Log In/i }).click();

    const error = page.locator('p.text-red-500');
    await expect(error).toBeVisible();
    await expect(error).not.toContainText('Invalid login credentials');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Logout', () => {
  test('logging out returns to the login page', async ({ page }) => {
    await seedAuthSession(page, USER_ID, 'owner@example.com');
    await mockAuthEndpoints(page);
    await mockListData(page);

    await page.goto('/');
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: /תפריט ניווט|Navigation menu/i }).click();
    await page.getByRole('link', { name: /התנתק|Logout/i }).click();

    await expect(page).toHaveURL('/login');
  });
});
