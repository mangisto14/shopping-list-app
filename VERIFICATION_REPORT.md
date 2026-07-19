# Verification Report — Lists/Categories Disappeared Regression

Status: **Verification and error-handling fix complete. Migrations NOT applied. Not merged.**

This follows up on `ROOT_CAUSE_ANALYSIS.md` per your request to verify the assumption before applying any fix.

---

## 1. Verify data still exists in Supabase

**I do not have live Supabase credentials in this sandbox** (no env vars, no `.env` values, no `supabase` CLI installed - re-confirmed before starting this check). I cannot run these queries myself, and I'm not going to fabricate results.

Please run these read-only queries yourself (Supabase Dashboard → SQL Editor, or `psql`/`supabase db` against the project):

```sql
select count(*) as lists_count from public.lists;
select * from public.lists order by created_at desc limit 5;

select count(*) as categories_count from public.categories;
select * from public.categories order by created_at desc limit 5;

select count(*) as list_members_count from public.list_members;
select * from public.list_members order by joined_at desc limit 5;

select count(*) as items_count from public.items;
select * from public.items order by created_at desc limit 5;
```

**Expected result if the root cause analysis is correct:** all four counts should be non-zero and match what existed before this branch's changes - this bug is a client read failure, not a write/delete, so nothing in the database should have changed. If any of these come back empty or lower than expected, that would contradict the root cause analysis and I'd want to know immediately - it would mean something else is going on beyond what's described in `ROOT_CAUSE_ANALYSIS.md`.

## 2. Confirm the failure is caused only by the missing `archived` column

I verified this two ways, both without needing live credentials:

**a) Local code-path check (temporary, reverted, never committed):** I removed `archived` from `useLists.ts`'s `.select(...)` string, then ran `tsc --noEmit`, `npm run build`, `npm run lint`, and the full mocked Playwright e2e suite. Result: identical outcome to the baseline (8 passed, the same 5 pre-existing unrelated failures, no new failures). This confirms nothing else in the surrounding code depends on `archived` being present - removing it doesn't break lists, categories, items, or active-list selection. I then reverted the edit immediately (`git checkout -- src/hooks/useLists.ts`); it was never committed.

**b) Direct reproduction of the actual failure mechanism:** Since this repo's e2e suite mocks the Supabase REST API via `page.route()` (no live project needed), I could simulate exactly what a live database missing the `archived` column would do: return an HTTP 400 from `GET /rest/v1/lists*` (PostgREST's real response shape for "column does not exist"), while leaving `categories`/`items` mocked normally. I seeded a pre-existing valid `activeListId` in `localStorage` first, to mirror a real user who already had a list selected before the regression.

Running this against the **pre-fix** code (this branch as it stood after Phase 3) reproduced the bug exactly:
- The "no lists" empty state appeared (`אין עדיין רשימות`).
- `localStorage`'s `shopping-list:activeListId` was wiped to `null`.

This directly confirms the causal chain described in `ROOT_CAUSE_ANALYSIS.md`: a failed `lists` fetch (regardless of *why* it fails - missing column, network error, RLS misconfiguration, anything) empties `lists`, which nulls `activeListId`, which empties `categories` and `items` too.

## 3. Improved error handling

Implemented in `src/hooks/useLists.ts` and `src/ActiveListContext.tsx`:

- **`useLists.ts`** now logs every fetch error (`console.error('useLists: failed to fetch lists', fetchError)`) and exposes a new `error: string | null` field, set on failure and cleared on success. `lists` itself is left untouched on error (as before - it simply isn't overwritten), but callers can now tell *why* it might look empty.
- **`ActiveListContext.tsx`** now takes `error` into account before touching `activeListId`: `if (error) return;` - it only proceeds to (possibly) clear/reassign the active list once a fetch has **definitively succeeded**, never on a failed one. "Genuinely zero lists" and "we don't know because the request failed" are no longer treated the same way.
- **UI**: `Lists.tsx` and `ShoppingList.tsx` now render a distinct "couldn't load your lists, please retry" error state (⚠️ icon, retry button) instead of silently falling through to the "you have no lists yet, create one" empty state when `error` is set.

### A second, compounding bug found during this verification

While reproducing the mechanism above, my first fix attempt still failed the "active list preserved" check. Root cause: **`useAuth()` starts every mount with `user === null` for the brief window before its own `getSession()` call resolves** - indistinguishable from "confirmed logged out" to anything that only checks `user`. `useLists.ts` was only checking `user`, not `useAuth()`'s own `loading` flag, so on every page load it briefly reported `loading: false, lists: []` *before auth had even resolved*, and `ActiveListContext` (correctly, per its own logic) treated that as "confirmed zero lists" and wiped the persisted active list - independent of, and before, the `archived`-column failure ever had a chance to matter.

Fixed by having `useLists.ts` also wait on `useAuth()`'s `loading` flag:
```ts
const { user, loading: authLoading } = useAuth();
...
useEffect(() => {
  if (authLoading) return;   // <- new: don't decide anything until auth has actually resolved
  if (!user) { setLists([]); setError(null); setLoading(false); return; }
  fetchLists();
}, [user, authLoading, fetchLists]);
```

This was a pre-existing race, not something introduced by Phase 1-3 - but it's exactly the kind of thing that turns "an unrelated fetch error" into "your entire persisted state got wiped instantly," so I'm including it here rather than filing it separately.

### New regression test

`e2e/lists-fetch-error.spec.ts` (permanent, committed): mocks the same 400-on-`/rest/v1/lists*` scenario and asserts (a) the error state renders instead of the empty-list state, and (b) a pre-existing `activeListId` in `localStorage` survives the failed fetch. Confirmed passing against the fixed code; confirmed it reproduces the bug (fails) if I temporarily revert the fix.

**Full suite after the fix:** `tsc --noEmit` clean, `npm run build` clean, `npm run lint` clean, Playwright: **9 passed** (the prior 8 baseline + this new test), same 5 pre-existing unrelated failures as every prior phase (`categories.spec.ts`, both `invite.spec.ts` cases, and 2 `items.spec.ts` cases) - confirmed via `git stash` earlier in this branch's history to predate all of this session's work. No new failures introduced by this fix.

## 4. Migration safety

Re-read both migrations end to end again for this check:

**`20260718100000_lists_archived_column.sql`**
- Fully additive: `alter table ... add column if not exists archived boolean not null default false;` + `create index if not exists idx_lists_archived ...`. No `drop`, `update`, or `delete` anywhere in the file.
- Idempotent: both statements use `if not exists` - safe to run any number of times.
- Does not modify existing rows: adding a column with a constant default (`false`) is a metadata-only operation in Postgres 11+ (no table rewrite), and there is no `update` statement touching pre-existing rows at all - they simply get the column's default value.
- Safe for production: additive column + index, no RLS policy changes (the existing `lists_update_owner_only` policy already covers writes to any column on `lists`, including this new one), no lock contention beyond the brief, cheap metadata change.

**`20260718090000_default_categories_for_every_list.sql`**
- Fully additive: only `create or replace function` (×3) and `create trigger` (guarded by `drop trigger if exists` first, the same idiom already used elsewhere in this repo's migrations, e.g. `on_auth_user_created`). No `drop table`, `drop column`, `update`, or `delete` anywhere.
- Idempotent: `create or replace function` is idempotent by definition; `drop trigger if exists` + `create trigger` is idempotent; `revoke all ... from public` is idempotent (a no-op if already revoked).
- Does not modify existing rows: the trigger only fires on new `insert`s into `lists` - it cannot retroactively touch any list that already exists. `create_default_list_for_user()`'s guard (`if exists (select 1 from public.lists where owner_id = p_user_id) then return;`) means it only ever runs for a user who currently owns zero lists, so it can't affect any existing user's data either.
- Safe for production: no schema changes to existing columns/tables, no RLS changes, `security definer` functions match the existing pattern used by `is_list_owner`/`is_list_member`/`handle_new_user` already in this codebase.

**Conclusion: both migrations are additive-only, idempotent, and cannot modify or delete any existing row.** They remain unapplied to any live database in this sandbox - I have not run `supabase db push` or merged anything.

---

## What I have NOT done (per your instructions)

- Have not applied either migration to any Supabase project.
- Have not merged this branch to `main`.
- Have not touched the migration files themselves.

## What I have committed to this feature branch

The error-handling fix (`useLists.ts`, `ActiveListContext.tsx`, `Lists.tsx`, `ShoppingList.tsx`, `src/i18n/lists.js`) and the new regression test (`e2e/lists-fetch-error.spec.ts`) - item 3 of your request, plus the auth-race fix found while verifying it. This is committed to `claude/app-design-branch-8hyo9t` only; it doesn't touch migrations and doesn't merge anything to `main`. Waiting for your direction on whether to proceed with applying the two pending migrations next.
