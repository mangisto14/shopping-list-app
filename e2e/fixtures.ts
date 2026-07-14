// e2e/fixtures.ts
// Shared mocking helpers for the E2E suite. Every test runs against a
// mocked Supabase REST/Auth/RPC API via Playwright's page.route() -
// the same technique used throughout this project's manual testing -
// so the suite needs no live Supabase project or secrets and is fully
// deterministic in CI.
import type { Page } from '@playwright/test';

export const LIST_ID = 'e2e0000-0000-0000-0000-000000000001';
export const USER_ID = 'e2e00001-1111-1111-1111-111111111111';
export const OTHER_USER_ID = 'e2e00002-2222-2222-2222-222222222222';

// Must match playwright.config.ts's FAKE_SUPABASE_URL
// ("https://e2e-test-project.supabase.co") - supabase-js derives its
// localStorage session key from the URL's hostname, so this has to
// track that value exactly for a pre-seeded session to be found.
export const AUTH_STORAGE_KEY = 'sb-e2e-test-project-auth-token';

export function fakeSession(userId: string, email: string) {
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh-token',
    user: { id: userId, email, aud: 'authenticated', role: 'authenticated' },
  };
}

// Seeds an already-logged-in session before the app's first script
// runs. Use for tests that don't exercise the login form itself.
export async function seedAuthSession(page: Page, userId = USER_ID, email = 'owner@example.com') {
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: AUTH_STORAGE_KEY, session: fakeSession(userId, email) }
  );
}

interface MockDataOptions {
  categories?: unknown[];
  items?: unknown[];
  listMembers?: unknown[];
  profiles?: unknown[];
  listName?: string;
  ownerId?: string;
}

// Mocks the REST endpoints the app's hooks call for a single active
// list. GET requests return the seeded fixtures; POST/PATCH/DELETE
// just echo a plausible success response, since every data hook in
// this app (useItems/useCategories/useMembers) applies optimistic
// local updates from the response body rather than re-fetching - the
// mock doesn't need real server-side persistence to exercise the UI
// flow end to end.
export async function mockListData(page: Page, options: MockDataOptions = {}) {
  const {
    categories = [],
    items = [],
    listMembers = [{ id: 'lm1', list_id: LIST_ID, user_id: USER_ID, role: 'owner', joined_at: new Date().toISOString() }],
    profiles = [{ id: USER_ID, email: 'owner@example.com' }],
    listName = 'משפחת מנגיסטו',
    ownerId = USER_ID,
  } = options;

  const lists = [
    {
      id: LIST_ID,
      name: listName,
      owner_id: ownerId,
      created_at: new Date().toISOString(),
      list_members: [{ count: listMembers.length }],
      items: [{ count: items.length }],
    },
  ];

  await page.route('**/rest/v1/lists*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `new-list-${Date.now()}`, ...body }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lists) });
  });

  await page.route('**/rest/v1/categories*', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `new-cat-${Date.now()}`, ...body }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
  });

  await page.route('**/rest/v1/items*', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `new-item-${Date.now()}`, ...body }),
      });
    }
    if (method === 'PATCH') {
      return route.fulfill({ status: 204, body: '' });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) });
  });

  await page.route('**/rest/v1/list_members*', async (route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listMembers) });
  });

  await page.route('**/rest/v1/profiles*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profiles) })
  );
}

// Mocks the invite_member_by_email RPC. Pass `errorCode` to simulate
// one of the Postgres function's raised exceptions
// (not_owner/user_not_found/already_member).
export async function mockInviteRpc(page: Page, { errorCode }: { errorCode?: string } = {}) {
  await page.route('**/rest/v1/rpc/invite_member_by_email', (route) => {
    if (errorCode) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: errorCode, code: 'P0001' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OTHER_USER_ID) });
  });
}

// Mocks GoTrue auth endpoints. Each flow (register/login/logout) only
// needs its own endpoint mocked; the others are harmless no-ops if hit.
export async function mockAuthEndpoints(
  page: Page,
  options: { signUpOk?: boolean; loginOk?: boolean; email?: string } = {}
) {
  const { signUpOk = true, loginOk = true, email = 'owner@example.com' } = options;

  await page.route('**/auth/v1/signup*', (route) => {
    if (!signUpOk) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'user_already_exists', error_description: 'User already registered', msg: 'User already registered' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...fakeSession(USER_ID, email), user: { id: USER_ID, email } }),
    });
  });

  await page.route('**/auth/v1/token*', (route) => {
    if (!loginOk) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession(USER_ID, email)) });
  });

  await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204, body: '' }));

  // Session bootstrap the app performs on load (getSession /
  // onAuthStateChange rely on local storage, but some SDK versions
  // also ping this to confirm the user still exists).
  await page.route('**/auth/v1/user*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: USER_ID, email }) })
  );
}
