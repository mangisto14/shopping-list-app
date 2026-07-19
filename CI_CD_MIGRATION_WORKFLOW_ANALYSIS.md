# CI/CD Migration Workflow Analysis

Status: **Workflow fixed. No SQL applied manually. No migrations applied by this change yet — the new `develop` deploy path requires secrets that don't exist in this repo yet (see "Required next step" below).**

---

## 1. Which branches trigger the workflow?

Before this fix, `.github/workflows/supabase-migrations.yml` had:
```yaml
on:
  pull_request:
    paths: ["supabase/migrations/**"]
  push:
    branches: [main]
    paths: ["supabase/migrations/**"]
```

- **`pull_request`** (any base branch) → ran the `validate` job only (a throwaway local Supabase stack, no secrets, no real project touched).
- **`push` to `main`** → ran `validate`, then (if it passed) `deploy`.
- **`develop` was not referenced anywhere.** A push to `develop` matched neither trigger — the workflow didn't run at all.
- **`feature/*` was not referenced either.** Only a PR opened *from* a feature branch would trigger `validate` (via the `pull_request` event, which doesn't filter by branch name).

This wasn't unique to this one workflow — `ci.yml` and `e2e.yml` (checked for completeness) are both `on: pull_request` + `push: branches: [main]` too. **None of this repo's three GitHub Actions workflows had any awareness that `develop` existed** — the main/develop/feature branch model was set up at the branch level only; the workflows were never updated to match when that restructuring happened.

## 2. Does it execute `supabase db push`?

Yes — the `deploy` job's "Apply migrations" step ran `supabase db push`. But that job's condition was:
```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```
This step has only ever run for a direct push to `main`.

## 3. Which Supabase project does it target?

Whatever project `secrets.SUPABASE_PROJECT_ID` resolves to, linked via `supabase link --project-ref "$SUPABASE_PROJECT_ID"`. GitHub Actions secrets aren't readable from a checkout, so the literal project can't be confirmed from the repo alone — but structurally, **there was only one deploy target in the whole workflow**, used exclusively for `main`. No second project or secret set was referenced anywhere in this repo (checked `vercel.json`, `supabase/config.toml`, `.env.example` — none mention a second project).

## 4. Why weren't `20260718090000_default_categories_for_every_list.sql` and `20260718100000_lists_archived_column.sql` applied?

Both were committed on the `claude/app-design-branch-8hyo9t` feature branch, then merged into `develop` (per the main/develop/feature restructuring). **`develop` has never been merged into `main`.** Since `deploy` only fired on `push` to `main`, and these commits never reached `main`, `supabase db push` never ran for them. This was never a bug in the SQL, the CLI invocation, or the secrets — the migrations were sitting on a branch the workflow had no trigger for at all.

## 5. Should the workflow automatically apply migrations after merging into develop?

**Yes, recommended** — given the main/develop/feature model this repo now uses, and the goal of making CI/CD the single source of truth for migrations, `develop` should have its own automatic deploy path, mirroring `main`'s.

**Critical caveat, and the one open item this analysis surfaces rather than resolves:** `develop` must deploy to a **separate** Supabase project from `main` — never the same one. Auto-applying every merge to `develop` directly against the production database would defeat the entire point of having an integration branch, and is a much larger risk than the missing-migration bug that started this investigation. I attempted to confirm whether a separate development project (and its own secrets) already exists via a clarifying question, but that didn't get an answer before I needed to continue — so **this fix assumes a separate project and references secrets that do not exist in this repo yet** (see below). This is a deliberately safe assumption: if those secrets are never created, the new job simply fails on an auth/link error every time `develop` is pushed — a loud, safe failure, never a silent deploy to the wrong database.

## 6. The fix (workflow only — no manual SQL, nothing bypassed)

`.github/workflows/supabase-migrations.yml` changes:

- Added `develop` to the `push.branches` trigger, so `validate` now also runs on pushes to `develop` (not just `main`).
- Renamed the existing `deploy` job to **`deploy-production`** (unchanged behavior otherwise — still gated to `github.ref == 'refs/heads/main'`, still uses the existing `SUPABASE_PROJECT_ID` / `SUPABASE_DB_PASSWORD` / `SUPABASE_ACCESS_TOKEN` secrets).
- Added a new **`deploy-development`** job, gated to `github.ref == 'refs/heads/develop'`, running the identical `link` → `migration list --linked` → `db push` sequence, but against **new, separate secrets**: `SUPABASE_DEV_PROJECT_ID` and `SUPABASE_DEV_DB_PASSWORD`. `SUPABASE_ACCESS_TOKEN` is reused as-is (it authenticates the CLI to your Supabase *account*, not to a specific project, so the same token is correct for both jobs — only the project ref and DB password need to differ).

YAML validated with `python3 -c "import yaml; yaml.safe_load(...)"` — well-formed. No app code touched (`tsc`/`build`/`lint` all still clean, as expected for a workflow-only change).

### Required next step (yours — I cannot do this)

For `deploy-development` to actually run instead of failing on link, add two new repository secrets (GitHub → Settings → Secrets and variables → Actions):
- `SUPABASE_DEV_PROJECT_ID` — the project ref of your **development** Supabase project (not the one `main` deploys to).
- `SUPABASE_DEV_DB_PASSWORD` — that project's database password.

Once those exist, the very next push to `develop` that touches `supabase/migrations/**` will apply `20260718090000` and `20260718100000` (and any future migration) automatically — this becomes the single source of truth you asked for, with no manual `db push` ever needed again for `develop`.

If it turns out there's actually only one Supabase project today (no separate dev project exists yet), tell me and I'll adjust `deploy-development` to point at the same project `main` uses instead — but I did not default to that, since it would mean every `develop` merge immediately mutates production.
