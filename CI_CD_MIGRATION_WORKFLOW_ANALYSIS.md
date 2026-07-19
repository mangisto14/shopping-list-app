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

### Update — confirmed: only one Supabase project exists today

The user confirmed there is currently a single Supabase project, with no separate development project. The section above described the original assumption (a separate dev project); this section supersedes it.

**Change made:** `deploy-development`'s `if:` condition now includes `&& secrets.SUPABASE_DEV_PROJECT_ID != ''`. Since that secret does not exist, the job **skips** (shows as gray/"skipped" in the Actions UI) on every push to `develop` — it no longer runs, and it no longer fails. `deploy-production` (the `main` path) is completely untouched by this change.

### What this means for continuing safely right now

- **Migrations merged into `develop` are validated** (the `validate` job still runs on every push to `develop` that touches `supabase/migrations/**`, spinning up a throwaway local Postgres/GoTrue/PostgREST stack via Docker - no secrets, no real project involved) but **are not automatically applied anywhere**.
- **The only way migrations reach your real (single) Supabase project remains merging into `main`** - exactly how it already worked before any of this investigation started. Nothing about how you actually ship a migration today has changed.
- **This is not a regression** relative to before this investigation: before, `develop` pushes didn't trigger the workflow at all; now they trigger `validate` (a pure safety net, catches bad SQL early) and a `deploy-development` job that's present but inert.

### Trade-offs of this approach vs. the alternative (reusing the single project for both branches)

| | **Skip `deploy-development` until a real dev secret exists (implemented)** | **Point `deploy-development` at the same single project `main` uses** |
|---|---|---|
| Risk to the one real database | None from `develop` - only `main` merges can ever touch it, same as before | Every push to `develop` that touches migrations applies immediately, ahead of (and independent from) any merge to `main` |
| "Ready for the future" | Yes - adding 2 secrets later is the entire activation step, no workflow edit needed | N/A - would need to be manually re-pointed later if a real dev project is ever introduced |
| Feedback speed on new migrations | Slower - migrations only take effect once merged to `main` | Faster - migrations take effect the moment they land on `develop`, before "release" |
| Meaning of `develop` as an integration branch | Preserved - `develop` stays a pre-production review point, matching the main/develop/feature model you set up | Weakened - `develop` and `main` behave as the same environment for schema purposes, even though app code still forks between them |
| Failure mode if misconfigured | Job skips quietly - very safe, but could be mistaken for "nothing to deploy" if someone forgets why | None to misconfigure (reuses working secrets), but a bad/experimental migration merged to `develop` hits the real database immediately, before anyone decided it was ready for `main` |

I implemented the left column as the minimal, safe default consistent with "do not assume a separate development database exists" and "do not modify production deployment behavior." If you'd rather have `develop` deploy immediately to the single project (the right column), say so explicitly and I'll point `deploy-development` at `SUPABASE_PROJECT_ID`/`SUPABASE_DB_PASSWORD` instead of the `_DEV_` pair - that's a one-line change, not a redesign, since the job shape is already in place.

### Required next step to fully activate (only if/when a second project is created)

Add two repository secrets (GitHub → Settings → Secrets and variables → Actions):
- `SUPABASE_DEV_PROJECT_ID` — the project ref of a future development Supabase project.
- `SUPABASE_DEV_DB_PASSWORD` — that project's database password.

The moment both exist, `deploy-development` starts running on the next `develop` push that touches migrations - no other change to this file is needed.

### Update — `shopping-list-dev` project created, job activated

The second Supabase project now exists (`shopping-list-dev`, ref `wfattbxpmugzhqzqharc`), so the assumption above is resolved. `deploy-development`'s `secrets.SUPABASE_DEV_PROJECT_ID != ''` skip-guard has been removed — the job's `if:` now mirrors `deploy-production`'s exactly (`needs: validate`, gated only on branch/event). This was a deliberate trade-off flip from the "skip quietly" default described above: now that a real dev project exists, a missing secret should surface as a loud, actionable failure on the next `develop` push, not a silent skip that could be mistaken for "nothing to deploy."

This repo change alone does not make migrations start flowing — it still depends on `SUPABASE_DEV_PROJECT_ID` and `SUPABASE_DEV_DB_PASSWORD` existing as repo secrets (see the README's secrets table) and on Supabase Auth cleanly bootstrapping this project from scratch (running every migration in `supabase/migrations/`, since it starts with no history). Those steps are outside what a repo-only change can do (GitHub secret values and Supabase project state aren't things a code change can create) and are called out as manual steps for whoever owns those two dashboards.
