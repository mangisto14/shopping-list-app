# React + Vite + TailWindCSS - A Template Repo

It is a template repository for you to start a project using React and TailwindCSS. You just need to create a new repository from this template repo by clicking the button at the top right corner of this page.

## Watch This Video

https://www.youtube.com/watch?v=Zk2YJUvfsOA

## Links

- Install Node.js: https://nodejs.org/en
- Install Vite: https://vitejs.dev/
- TailwindCSS: https://tailwindcss.com/
- How to Learn TailwindCSS?: https://www.youtube.com/shorts/BhasK2BPn8c

## Database Migrations

This project's database schema lives in `supabase/migrations/` as SQL files, managed with the [Supabase CLI](https://supabase.com/docs/guides/cli).

### 1. How migrations are created

Generate a new, empty migration file with a correctly formatted timestamp:

```bash
supabase migration new <short_description>
```

This creates `supabase/migrations/<timestamp>_<short_description>.sql`. Write the schema change as plain SQL in that file. Prefer additive, idempotent statements (`create table if not exists`, `create index if not exists`, `drop policy if exists` before `create policy`, etc.) so the migration can be safely re-run.

### 2. How migrations are deployed

Pushing a commit to `main` that touches `supabase/migrations/**` automatically triggers [`.github/workflows/supabase-migrations.yml`](.github/workflows/supabase-migrations.yml), which links the Supabase project and runs `supabase db push` against it. The workflow fails the build (and does not apply anything partially silently) if any step errors. It never runs on pull requests or other branches.

### 3. Required GitHub Secrets

Configure these under the repository's **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | A [personal access token](https://supabase.com/dashboard/account/tokens) authorizing the CLI against the Supabase Management API. |
| `SUPABASE_PROJECT_ID` | The target project's reference ID (from the project's Supabase dashboard URL or Settings → General). |
| `SUPABASE_DB_PASSWORD` | The project's database password, required by `supabase db push` to connect directly to Postgres non-interactively. Reset it from Settings → Database if it isn't already known. |

None of these are ever committed to the repository - the workflow reads them exclusively from GitHub Secrets.

### 4. How to manually run migrations

To apply migrations from a local machine instead of waiting on CI:

```bash
supabase login                              # one-time, opens a browser to authenticate
supabase link --project-ref <project-ref>   # links this checkout to the target project
supabase db push                            # applies any migrations not yet run remotely
```

To preview what a fresh database would look like without touching the remote project, use `supabase db reset` against a local Supabase stack (`supabase start`) instead.
