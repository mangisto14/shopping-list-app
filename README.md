# 🛍️ Mangisto Shopping List

**A real-time, collaborative shopping list for families and roommates.**

[![CI](https://github.com/mangisto14/shopping-list-app/actions/workflows/ci.yml/badge.svg)](https://github.com/mangisto14/shopping-list-app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mangisto14/shopping-list-app)

---

## Overview

**Problem statement:** Families and roommates need a shared shopping list that updates in real time — one person adds "milk" from the store, and everyone else's list updates instantly, without refreshing, without duplicate items, and without a group chat full of "did you get eggs?" messages.

Mangisto Shopping List solves this with a single shared list per household, backed by Postgres Realtime subscriptions, so every add, check-off, rename, and delete appears on every member's screen the moment it happens.

## Features

- 🛒 **Shared Lists** — one or more lists per household, each with its own members and categories
- ⚡ **Realtime Updates** — items and categories sync live across every connected device via Supabase Realtime (Postgres change streams), no polling or manual refresh
- 🗂 **Category Management** — organize items into categories with color-coded chips and per-category progress
- 👨‍👩‍👧 **Family Collaboration** — invite members to a list, see who's on it, and track real membership (not fabricated presence)
- 📊 **Statistics Dashboard** — completion rate, remaining items, and category breakdown at a glance
- 📱 **Responsive Design** — mobile-first, RTL-native (Hebrew primary, English supported), installable as a PWA
- 🔒 **Row-Level Security** — every table is scoped by Postgres RLS to list membership, enforced at the database layer, not just in the client

## Architecture

```
React + TypeScript (Vite)
        │
        ▼
  Supabase Auth  ──────────►  PostgreSQL (RLS-scoped tables)
        │                            │
        │                            ▼
        └───────────────►  Supabase Realtime (Postgres change streams)
                                      │
                                      ▼
                          Live updates pushed to every
                          connected client on the list
```

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Supabase (Postgres, Auth, Realtime) |
| Database | PostgreSQL with Row-Level Security |
| Realtime sync | Supabase Realtime (`postgres_changes`) |
| Hosting | Vercel |
| CI | GitHub Actions (typecheck, lint, build) |

See [`docs/architecture-diagram.md`](docs/architecture-diagram.md) for the full data-flow diagram, including auth, RLS, and Realtime subscription details.

## Screenshots

See [`docs/screenshots.md`](docs/screenshots.md).

## Installation

```bash
git clone https://github.com/mangisto14/shopping-list-app.git
cd shopping-list-app
npm install
cp .env.example .env   # then fill in your Supabase credentials, see below
npm run dev
```

Requires Node.js 18+ and a Supabase project (free tier is sufficient).

## Environment Variables

Create a `.env` file (never committed — see `.gitignore`) based on `.env.example`:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL (Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon/public key (Project Settings → API) |
| `VITE_APP_URL` | No | Canonical base URL used to build invite links (e.g. `https://mangisto.best`). Falls back to `window.location.origin` if unset — safe to leave empty for local dev and preview deploys. |

The anon key is safe to expose client-side by Supabase's design — access control is enforced by Row-Level Security policies on each table, not by keeping this key secret.

## Deployment

This project deploys to **Vercel** (see `vercel.json` for the SPA rewrite rule) and uses **GitHub Actions** for CI and database migrations.

### CI Pipeline

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) validates every change before it lands, on every pull request and every push to `main`. No secrets are required.

**What it validates:**
- **TypeScript** (`npx tsc --noEmit`) — the project compiles under `tsconfig.json`'s strict settings, with no type errors.
- **Lint** (`npm run lint`) — ESLint rules pass with zero warnings allowed (`--max-warnings 0`).
- **Build** (`npm run build`) — the production Vite build completes successfully, the same command Vercel runs on deploy.

Any failing step stops the pipeline and marks the run as failed. A results table is always written to the workflow run's summary.

### Database Migrations

The schema lives in `supabase/migrations/` as SQL files, managed with the [Supabase CLI](https://supabase.com/docs/guides/cli).

**Creating a migration:**
```bash
supabase migration new <short_description>
```
Prefer additive, idempotent statements (`create table if not exists`, `drop policy if exists` before `create policy`, etc.) so migrations can be safely re-run.

**Deploying migrations:** pushing a commit to `main` that touches `supabase/migrations/**` automatically triggers [`.github/workflows/supabase-migrations.yml`](.github/workflows/supabase-migrations.yml), which links the Supabase project and runs `supabase db push`. It never runs on pull requests.

Required GitHub Secrets (**Settings → Secrets and variables → Actions**):

| Secret | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [Personal access token](https://supabase.com/dashboard/account/tokens) authorizing the CLI against the Supabase Management API |
| `SUPABASE_PROJECT_ID` | Target project's reference ID |
| `SUPABASE_DB_PASSWORD` | Project's database password, required for `supabase db push` |

**Manual migration run:**
```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new)
2. Set the environment variables from the table above in the Vercel project's settings (Production, Preview, and Development as needed)
3. Vercel auto-detects the Vite build (`npm run build`, output directory `dist`); `vercel.json`'s rewrite rule handles client-side routing so deep links (`/statistics`, `/family`, etc.) don't 404 on refresh

## Future Roadmap

- Real Supabase Presence integration (live "who's online" — currently intentionally not shown rather than faked, since no Presence channel is wired up yet)
- `profiles` table for real display names/avatars (list members currently show by user ID — see `FamilyMembers.tsx`)
- Real invite-link backend (`invite_links` table with expiry — currently a same-session-only mock, documented in `InviteLinkCard.tsx`)
- Item-level timestamps to power a genuine activity history / trends view (currently intentionally omitted rather than fabricated — see `Statistics.tsx`)
- Push notifications for realtime item changes

## License

MIT — see [`LICENSE`](LICENSE).
