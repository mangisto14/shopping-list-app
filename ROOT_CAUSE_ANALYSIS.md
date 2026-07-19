# Root Cause Analysis — Shopping Lists and Categories Disappeared

Status: **Analysis only. No fix has been applied.**

## Root Cause

**The frontend now queries a database column (`lists.archived`) that does not exist yet on the Supabase project this build is running against, because the migration that creates it has never been applied there.**

Phase 2 (commit `521b6c0`) changed `useLists.ts`'s `fetchLists()` to select an `archived` column:

```ts
const { data, error } = await supabase
  .from('lists')
  .select('id, name, owner_id, created_at, archived, list_members(count), items(count)')
  .order('created_at', { ascending: true });

if (!error && data) setLists(...);   // <- silently skipped on error
```

The `archived` column is created by `supabase/migrations/20260718100000_lists_archived_column.sql`, also written in Phase 2. **That migration file exists in the repo, but has never been run against any live/linked Supabase database.** This repo's CI (`.github/workflows/supabase-migrations.yml`) only applies migrations to the real project in its `deploy` job, which is explicitly gated to `push` events on `main`:

```yaml
deploy:
  needs: validate
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

All of this session's work — including this migration — has only ever been committed to `claude/app-design-branch-8hyo9t`, which has never been merged to `main`. Confirmed directly:

```
$ git ls-tree origin/main -- supabase/migrations/
20260712120000_initial_schema.sql
20260713090000_default_list_on_signup.sql
20260714120000_list_sharing_and_roles.sql
```

`origin/main` only has the first three migrations. The `archived` column migration (and, for what it's worth, the REPLICA IDENTITY FULL migration and the default-categories-per-list migration from this same session) exist only as files on this branch and have never reached the real database.

So: the moment Phase 2's frontend code shipped, every `lists` fetch against the real project started asking Postgres for a column that isn't there. PostgREST rejects the entire request in that case (HTTP 400, "column lists.archived does not exist") rather than just omitting the missing column — the request fails outright, `data` comes back `null`, `error` is set.

## The Cascade (why *categories* disappeared too, not just lists)

1. `fetchLists()`'s `if (!error && data) setLists(...)` guard means **on error, `setLists` is never called** — `lists` stays at its initial empty array (`useState<ShoppingListSummary[]>([])`).
2. `ActiveListContext.tsx`'s effect recomputes on every `lists` change:
   ```ts
   const storedIsValid = lists.some((l) => l.id === activeListId && !l.archived);
   if (!storedIsValid) {
     const fallback = lists.find((l) => !l.archived)?.id ?? null;
     setActiveListIdState(fallback);
     if (fallback) localStorage.setItem(STORAGE_KEY, fallback);
     else localStorage.removeItem(STORAGE_KEY);   // <- wipes the persisted active list
   }
   ```
   With `lists = []`, `storedIsValid` is always `false`, so `activeListId` is reset to `null` **and the previously-working `localStorage` entry for the active list is deleted.**
3. `useCategories.ts` and `useItems.ts` both short-circuit at the top of their fetch functions:
   ```ts
   if (!activeListId) { setCategories([]); setLoading(false); return; }   // useCategories.ts
   if (!activeListId) { setItems([]); setLoading(false); return; }        // useItems.ts
   ```
   With `activeListId === null`, both come back empty on every subsequent render, regardless of what's actually in the database.
4. `Lists.tsx` renders `lists.length === 0 ? <EmptyState/> : ...` and `ShoppingList.tsx` renders its `!activeListId` branch (`<EmptyListsState/>`) — both show "no lists" even though the underlying rows are untouched.

This exactly reproduces the reported symptom: shopping lists and categories both appear to have vanished, with no error visible in the UI, because the failure is swallowed at the very first step and everything downstream is just correctly reacting to "there is no active list."

## Files Involved

| File | Role in the bug |
|---|---|
| `src/hooks/useLists.ts` | Queries the not-yet-existing `archived` column; silently no-ops on the resulting error instead of surfacing it. |
| `src/ActiveListContext.tsx` | Reacts to the now-empty `lists` array by nulling `activeListId` and deleting the persisted selection from `localStorage`. |
| `src/hooks/useCategories.ts`, `src/hooks/useItems.ts` | Both correctly, but unhelpfully, short-circuit to empty state once `activeListId` is `null`. |
| `src/pages/Lists.tsx`, `src/pages/ShoppingList.tsx` | Render the empty-state UI that the user saw — a correct rendering of an incorrect (empty) data state. |
| `supabase/migrations/20260718100000_lists_archived_column.sql` | The migration that was written but never applied to the live database — the actual gap. |
| `.github/workflows/supabase-migrations.yml` | Explains *why* it was never applied: the `deploy` job only runs on push to `main`, and this work has only ever lived on a feature branch. |

## Migration Involved

`supabase/migrations/20260718100000_lists_archived_column.sql` — the one whose absence from the live database directly causes the failure.

(`supabase/migrations/20260718090000_default_categories_for_every_list.sql` shares the same undeployed status but is not itself the cause of this particular outage: no shipped frontend code queries anything that migration adds, so its absence is currently silent, not breaking. It's flagged here because it's exposed to the exact same class of risk.)

## Was Existing Data Modified or Deleted?

**No.** Verified directly by re-reading both new migrations end to end:

- `20260718100000_lists_archived_column.sql` contains only `alter table ... add column if not exists` and `create index if not exists` — no `update` or `delete` statement of any kind.
- `20260718090000_default_categories_for_every_list.sql` only adds functions/a trigger (`create or replace function`, `create trigger`) that fire on **new** `INSERT`s into `lists`. It does not backfill or touch any existing row. `create_default_list_for_user()` was edited to remove its own inline category insert (now handled by the new trigger instead), but that function still opens with `if exists (select 1 from public.lists where owner_id = p_user_id) then return;` — it only ever runs for a user who owns zero lists, so it cannot affect anyone with existing data either.

This is a **read-path failure**, not a data-loss event. The actual rows in `lists`, `categories`, and `items` are expected to be fully intact in the live database - the app just can't see them because one query in the chain 400s and every downstream hook faithfully reports "empty" in response.

(I have no live Supabase credentials in this sandbox to query the real project directly, so I can't independently confirm the rows are still there - but nothing in the code path we shipped issues a delete, and the failure mode described above only requires a failed *read*, not a lost write. Recommend confirming via the Supabase dashboard's Table Editor as a first, purely-observational sanity check before anything else.)

## Exact Fix (proposed - not yet applied)

Two independent things need to happen:

1. **Apply the pending migrations to whatever Supabase project this build actually talks to.** Either:
   - Merge this branch to `main`, letting the existing CI `deploy` job run `supabase db push` automatically, or
   - If you want to verify against this branch before merging, manually run `supabase link --project-ref <ref> && supabase db push` against that same project first.

   Either way, once `lists.archived` actually exists, `fetchLists()`'s query stops failing, `lists` populates normally, `activeListId` resolves to a real list again, and `categories`/`items` follow immediately - all of this is expected to self-heal the moment the schema catches up to the code, with zero data recovery needed.

2. **Make `fetchLists()` fail loudly instead of silently**, so this exact failure mode is visible next time instead of looking like data loss. Currently:
   ```ts
   if (!error && data) setLists(...);
   ```
   has no `else` branch at all. At minimum it should log the error (matching the existing pattern already used elsewhere in this codebase, e.g. `useItems.ts`'s `addItem`: `console.error('addItem: insert failed', { ... })`). This wouldn't have prevented the outage, but would have turned a silent, confusing "everything is gone" into an immediately diagnosable console error pointing straight at the missing column.

I have **not** made either change yet, per your instruction to hold off until the analysis is confirmed.

## Why This Happened

This repo's migrations only reach the real, linked Supabase project through the `deploy` job in `.github/workflows/supabase-migrations.yml`, which is gated to `push` events on `main`. All of this session's schema work - this migration, the default-categories trigger migration, and even the earlier REPLICA IDENTITY FULL migration from a prior turn - has only ever been committed to the `claude/app-design-branch-8hyo9t` feature branch, which has never been merged. There is no equivalent gate on the frontend: code on this branch takes effect the moment it's built/previewed/run, with no dependency check on whether the schema it assumes has actually reached the same database. Phase 2 added a frontend query against a column whose only existence was "a `.sql` file sitting in this branch's `supabase/migrations/` folder" - which, to Postgres, is not the same thing as an applied migration.

## How To Prevent This In The Future

- **Before shipping frontend code that depends on a new column/table/trigger, confirm the migration has actually been applied to whatever environment that code will run against** - not just that the migration file exists in the same commit/branch. "The migration is written" and "the migration is deployed" are two different facts and this repo's own CI setup keeps them separate on purpose (validate-on-PR vs. deploy-on-merge-to-main); frontend work needs to respect that same separation instead of assuming they happen together.
- **Never let a data-fetch error resolve to a silent empty state.** `useLists.ts`, `useCategories.ts`, and `useItems.ts` all currently have this shape (`if (!error && data) setX(...)`, nothing on the error path). At minimum, log every fetch error; ideally surface a visible "couldn't load your lists" state distinct from the legitimate "you have zero lists" empty state, so the two are never visually indistinguishable again.
- **When a branch accumulates several migrations across multiple work sessions without merging, treat that as a standing risk, not just a queue.** Every additional migration sitting unmerged widens the gap between what the frontend on that branch assumes and what the real database actually has. A quick `supabase migration list --linked` check (already used in the CI deploy job) is a cheap way to confirm the live project's applied-migration state matches expectations before relying on new schema in frontend code.
