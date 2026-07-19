# Development Environment Report — `shopping-list-dev` (ref `wfattbxpmugzhqzqharc`)

Status: **App code, migrations, and workflow wiring verified statically and via local build/lint/type-check/e2e. The actual remote `shopping-list-dev` Supabase project, its GitHub secrets, and the Vercel Preview environment were NOT reachable from this sandbox and remain unverified live — see "What could not be verified" below. One real, currently-live bug was found and is already fixed on this branch (not yet on `develop`).**

This sandbox has no Supabase credentials, no `supabase` CLI, no working Docker daemon, and no Vercel API access — the same constraint noted in this repo's earlier `VERIFICATION_REPORT.md`. Everything below is either (a) verified directly against real GitHub Actions history via the GitHub API, (b) verified locally against the repo's own code/SQL, or (c) explicitly marked unverifiable from here, with exact commands for you to run.

---

## Summary table

| # | Check | Result |
|---|---|---|
| 1 | GitHub Actions can authenticate to `shopping-list-dev` | **Unverified** — no CI run has ever executed against it (see below). A real, separate bug that would have broken this is fixed on this branch. |
| 2 | All pending migrations applied successfully | **Unverified live.** Statically verified: 6 migration files, idempotent, no SQL errors detectable by inspection. |
| 3 | Schema contains the `archived` column | **Confirmed in source** (`supabase/migrations/20260718100000_lists_archived_column.sql`) and consumed correctly by app code. **Not confirmed on the live dev project.** |
| 4 | RLS policies and Realtime configuration | **Confirmed in source** — RLS enabled + policies on all 5 tables, `supabase_realtime` publication entries for `items`/`categories`/`list_members`, `REPLICA IDENTITY FULL` fix applied. **Not confirmed on the live dev project.** |
| 5 | Vercel Preview env vars point to `shopping-list-dev` | **Unverifiable from this session** — no Vercel API/dashboard access. |
| 6 | App runs against the dev database (auth, lists, categories, items load; no 42703 errors) | **App logic verified** via `tsc --noEmit`, `npm run lint`, `npm run build`, and the full 24-test Playwright e2e suite — all pass. **Not run against the real dev database** (no live credentials available here; the e2e suite is intentionally fully mocked and never touches a real Supabase project either). |
| 7 | This report | Done. |

---

## 1. GitHub Actions authentication to `shopping-list-dev`

**Could not verify live** — pulled the actual workflow run history for `.github/workflows/supabase-migrations.yml` via the GitHub API:

- **This branch (`claude/shopping-list-dev-supabase-i9lzi1`) has 0 workflow runs, ever.** All three commits made on it so far only touched the workflow file/docs, never `supabase/migrations/**` — and the workflow's `push` trigger is path-filtered to that directory, so it correctly never fired. This is expected, not a failure.
- **`develop`'s most recent run (id `29683529989`, commit `58326d8`) completed with `conclusion: failure` and zero jobs** (`get_job_logs` returned `total_jobs: 0`; the logs endpoint 404s). A GitHub Actions run with no jobs and a 404 on logs is the signature of a **workflow-file validation failure at trigger time**, not a real job failure.
  - **Root cause, confirmed:** that commit's `deploy-development.if` was `github.event_name == 'push' && github.ref == 'refs/heads/develop' && secrets.SUPABASE_DEV_PROJECT_ID != ''`. The `secrets` context **is not permitted in a job-level `if:` condition** in GitHub Actions ([actions/runner#520](https://github.com/actions/runner/issues/520); [GitHub Docs — Contexts](https://docs.github.com/en/actions/learn-github-actions/contexts)) — it raises `Unrecognized named-value: 'secrets'` and the whole run aborts before any job is created.
  - **This means `develop`'s copy of the workflow has been broken since that commit** — every push to `develop` that touches migrations would fail this way, never reaching `validate` or `deploy-development`.
  - **This branch's commit `42f0d57`** ("Activate develop deploy path...") already removed that guard, replacing it with a plain `github.ref` check — which happens to also fix this bug, independent of whether it was framed as "the dev project now exists." Confirmed via `grep -n "if:" .github/workflows/supabase-migrations.yml`: no `secrets.` reference appears in any `if:` condition on this branch.
  - **Action needed:** this branch is not yet merged into `develop` (`git log origin/develop..HEAD` shows 2 unmerged commits, no open PR exists). Until it merges, `develop` itself is still broken. Recommend merging soon.
- Because no run has ever reached `deploy-development`'s `Link Supabase project` step, there is **no direct evidence either way** that `SUPABASE_DEV_PROJECT_ID` / `SUPABASE_DEV_DB_PASSWORD` exist as repo secrets or that they authenticate successfully. This session has no API access to list or read repo secrets (by GitHub design, secret values are never readable, and this session's GitHub App also has no secrets-listing scope).

**To get real confirmation:** merge this branch into `develop` (fixes the broken guard) and push any change touching `supabase/migrations/**` — `deploy-development` will then actually run. Alternatively, run manually:
```bash
supabase login
supabase link --project-ref wfattbxpmugzhqzqharc
supabase migration list --linked
```

## 2. All pending migrations applied successfully

**Could not verify live** for the same reason as #1 — no run has ever reached `supabase db push` against this project.

**Statically verified** by reading all 6 files in `supabase/migrations/`:

| File | Purpose |
|---|---|
| `20260712120000_initial_schema.sql` | Baseline: `lists`, `list_members`, `categories`, `items`, `history`, RLS, initial Realtime publication |
| `20260713090000_default_list_on_signup.sql` | `auth.users` trigger to bootstrap a default list/categories per signup |
| `20260714120000_list_sharing_and_roles.sql` | `profiles` table, `list_members.role`, invite RPC, Realtime for `list_members` |
| `20260716140000_..._replica_identity_full.sql` | `REPLICA IDENTITY FULL` on `items`/`categories`/`list_members` (Realtime DELETE fix) |
| `20260718090000_default_categories_for_every_list.sql` | Trigger-based category seeding for every new list, not just signup |
| `20260718100000_lists_archived_column.sql` | Adds `lists.archived` |

All statements use `if not exists` / `drop ... if exists` / `on conflict` guards, matching this repo's own idempotency convention (see README) — safe to run once from empty, and safe to re-run. No local Supabase/Docker stack was available in this sandbox (`dockerd` cannot start here — no daemon socket, no privilege to start one) to do a from-scratch `supabase db reset` replay this session; that replay is exactly what the `validate` job already does in CI on every push, and will run automatically the next time this branch or `develop` pushes a migration change.

## 3. `archived` column

**Confirmed in source.** `supabase/migrations/20260718100000_lists_archived_column.sql`:
```sql
alter table public.lists
  add column if not exists archived boolean not null default false;
```
And confirmed consumed correctly by the app: `src/hooks/useLists.ts:46` selects `'id, name, owner_id, created_at, archived, list_members(count), items(count)'`, and `archived` is read/written throughout `Lists.tsx`, `ListActionsSheet.tsx`, and `ActiveListContext.tsx`. This is the exact column whose absence would cause a Postgres `42703` (undefined column) error on every `lists` fetch.

**Not confirmed against the live project** — requires a real connection (see #1).

## 4. RLS policies and Realtime configuration

**Confirmed in source:**
- **RLS:** `alter table ... enable row level security` on all 5 tables (`lists`, `list_members`, `categories`, `items`, `history`, plus `profiles`), with explicit `select`/`insert`/`update`/`delete` policies per table in `20260712120000_initial_schema.sql` and `profiles`' policy in `20260714120000_list_sharing_and_roles.sql`. All policy-membership checks route through `SECURITY DEFINER` helper functions (`is_list_owner`, `is_list_member`, `shares_list_with`) specifically to avoid RLS self-reference recursion.
- **Realtime:** `alter publication supabase_realtime add table` for `items` + `categories` (initial schema) and `list_members` (sharing migration), each guarded by an `if not exists` check against `pg_publication_tables`. `20260716140000_...replica_identity_full.sql` additionally sets `REPLICA IDENTITY FULL` on all three tables — required for Realtime DELETE events to survive the `list_id=eq.<id>` filter in `src/hooks/useRealtimeTable.ts` (documented root-cause comment in that migration).

**Not confirmed against the live project** — `supabase_realtime` is a Supabase-platform-managed publication that only exists on a real Supabase project (not a vanilla Postgres), and this sandbox has no route to query it live.

## 5. Vercel Preview environment

**Unverifiable from this session** — no Vercel API, dashboard access, or committed `.vercel/project.json` (correctly gitignored) exists here. Per the README's Vercel section, please confirm directly in **Vercel → Project Settings → Environment Variables**:
- `VITE_SUPABASE_URL` = `https://wfattbxpmugzhqzqharc.supabase.co` (Preview scope)
- `VITE_SUPABASE_ANON_KEY` = the `shopping-list-dev` anon key (Preview scope)
- Production scope left pointing at the production project (unchanged)

## 6. Running the app against the development database

**Could not run against the real dev database** — no `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` for `wfattbxpmugzhqzqharc` are available in this sandbox (they live in your Vercel/local `.env`, never in the repo). This repo's own e2e suite is also, by design, fully mocked (`page.route()` intercepts every Supabase call — see `e2e/fixtures.ts` and `playwright.config.ts`), so even a full green e2e run does not touch any real project, dev or production.

**What was actually run and passed, locally, in this sandbox:**
```
npx tsc --noEmit         → clean, no type errors
npm run lint             → clean, 0 warnings
npm run build            → succeeds (vite build, dist/ generated)
npx playwright test      → 24/24 passed, including:
  - auth.spec.ts: register, login (success + error paths), logout
  - categories.spec.ts: create category (+ empty state)
  - items.spec.ts: create item, complete item (+ empty state)
  - lists-management.spec.ts: rename, archive/unarchive, delete, switch active list
  - invite.spec.ts: invite by email (success + error + permission paths)
```
This confirms the application's auth/lists/categories/items code paths are logically correct against a mocked backend shaped like the real schema (including the `archived` field). It does **not** confirm those same flows succeed against the real `shopping-list-dev` project — that requires the real anon key, which only you can supply.

**No `42703` errors were produced** in any of the above — but note the entire class of `42703` bugs this app has previously hit (see `ROOT_CAUSE_ANALYSIS.md`) comes from the *mismatch* between mocked/expected schema and the real deployed schema, which by definition a mocked test suite cannot catch. The only way to rule out `42703` for real is a live query against `wfattbxpmugzhqzqharc` after migrations have actually run there — e.g.:
```sql
select id, name, owner_id, created_at, archived from public.lists limit 1;
```

---

## What you need to do to close the remaining gaps

1. **Merge this branch into `develop`** (or otherwise land its 2 unmerged commits) — `develop`'s current copy of the workflow has a real bug (`secrets` in a job `if:`) that fails every push to it before any job runs.
2. **Confirm `SUPABASE_DEV_PROJECT_ID` (`wfattbxpmugzhqzqharc`) and `SUPABASE_DEV_DB_PASSWORD` exist** as repo secrets (Settings → Secrets and variables → Actions) — cannot be checked from here.
3. **Push (or merge) any change touching `supabase/migrations/**`** on `develop` or this branch, and watch the `Supabase Migrations` run — that's the first real end-to-end test of #1 and #2 above.
4. **Confirm Vercel Preview env vars** as listed in #5.
5. Once 2–4 are done, load the deployed Preview URL in a browser and confirm register/login, and that lists/categories/items load with no console/network errors — this is the one step nothing in this sandbox can substitute for.
