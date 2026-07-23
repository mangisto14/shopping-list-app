# Root Cause Report: Email Invite — Runtime Investigation

**Method:** genuine runtime execution, not a code diff. A real Supabase stack (actual Postgres 15 + GoTrue + PostgREST + Realtime + Mailpit, via Docker) was built from each branch's own migrations, the app was run against it, and the full Email Invite flow was driven through a real browser (Playwright) with real HTTP requests — no `page.route()` mocking anywhere in this investigation.

## Conclusion, up front

**No regression exists in the code, the database schema, or the CI deployment pipeline.** The Email Invite flow was tested end-to-end, twice, on two different branches, against two independently-built real backends, and it worked correctly and identically both times — signup, RPC call, database write, success UI, error handling, and server-side permission enforcement all passed. I could not reproduce "it doesn't work." The most likely explanation for what you're seeing is described in **"What this most likely is instead"** below — I could not confirm it directly because it requires access I don't have (your browser, your deployed environment), so I'm flagging it precisely rather than guessing further.

## What was actually run

1. `dockerd` started in this sandbox (not available in earlier sessions — this one succeeded), enabling `supabase start` against a **real** local Postgres/GoTrue/PostgREST/Realtime/Mailpit stack (Edge Functions excluded — see below).
2. Checked out `claude/app-design-branch-8hyo9t`. `supabase start` applied its 5 migrations from scratch, no errors.
3. Ran `npm run dev` pointed at that real local backend (`VITE_SUPABASE_URL=http://127.0.0.1:54321`).
4. Via a real headless browser: registered two real accounts (real `supabase.auth.signUp` calls, real GoTrue), logged in as the "owner," opened the Invite modal, and submitted the invitee's email through the actual `InviteByEmailForm`.
5. **Result:** success toast ("✓ נוסף/ה לרשימה") shown; **directly queried the database** afterward and confirmed a real `list_members` row was inserted linking the invitee to the owner's list.
6. Repeated with a **non-existent** email → friendly "לא נמצא משתמש/ת..." error shown (not a raw SQL error).
7. Repeated by calling the `invite_member_by_email` RPC **directly via `fetch`, bypassing the UI entirely**, authenticated as a non-owner member → server returned `400 {"message":"not_owner"}`. This proves the owner-only restriction is enforced by the database function itself, not just by hiding a button client-side.
8. Checked **Mailpit** (captures every email any local service would send) after all of the above → **zero messages, every time.**
9. Stopped everything, checked out `develop`, ran `supabase db reset` (develop has one extra, unrelated migration — `lists.archived` — applied cleanly alongside the rest), reran the exact same sequence (steps 3–8) against a fresh backend built from `develop`'s migrations.
10. **Identical results.** Same success, same DB row created, same friendly errors, same server-side enforcement, same zero emails sent.

## Layer-by-layer, as requested

| Layer | Finding |
|---|---|
| `InviteMemberModal` | Renders both Share Link and Email Invite. Identical source on both branches (previously confirmed via diff; now also confirmed working identically at runtime). |
| `InviteByEmailForm` | Submits correctly, shows loading/success/error states correctly on both branches. |
| `useMembers` (`inviteMember`) | Calls `supabase.rpc('invite_member_by_email', ...)` correctly; return value handled correctly on both branches. |
| `invite_member_by_email` RPC | **Executes successfully** against a real database on both branches. Confirmed: owner can add an existing user; non-existent email raises `user_not_found`; non-owner is rejected with `not_owner` (tested via direct RPC call, not just UI). |
| Edge Functions | **Not used at all.** `supabase/functions/` does not exist in this repo, on any branch. Nothing here to investigate. |
| Supabase migrations | All 5 (app-design branch) / 6 (develop) migrations apply cleanly from an empty database, on both branches. The migration containing the invite RPC, `profiles` table, and its RLS policy (`20260714120000_list_sharing_and_roles.sql`) is byte-identical on both. |
| Database tables | `profiles`, `list_members` (with `role`), `lists` all present and correctly related on both. |
| RLS policies | `is_list_owner`/`is_list_member` helper functions and the `not_owner` check inside the RPC itself enforce access correctly — verified by directly attempting the privileged action as an unprivileged user and getting rejected. |
| Email sending | **This app never sends an actual email, on either branch, by design.** "Email Invite" means "look up an existing app user by their email and add them as a member" — not "send an invitation email." Confirmed with real evidence (Mailpit, zero messages), not by reading code. |
| Accept invitation flow | **Does not exist, on either branch.** There is no pending/accept state — the RPC adds the membership immediately and unconditionally (if the email matches an existing user and the caller owns the list). This is not a regression; it has never been part of the design. |

## The real (already-documented, already-fixed) bug I found in the pipeline

An earlier investigation in this repo (`DEVELOPMENT_ENVIRONMENT_REPORT.md`) found that `develop`'s `supabase-migrations.yml` briefly had a broken `deploy-development` job — its `if:` condition referenced `secrets.SUPABASE_DEV_PROJECT_ID`, which GitHub Actions does not permit in a job-level `if:`, causing the entire workflow run to fail validation before any job started (commit `58326d8`, run `29683529989`, 2026-07-19). **This was already fixed** (commit `42f0d57`, merged into `develop` on 2026-07-23) and is not a currently-live issue.

**Direct confirmation the fix is working:** I pulled the actual GitHub Actions run history for this repo. The most recent push to `develop` (this session, commit `01872d2`, run `29988376851`, today) shows:
- `Validate migrations (local stack)` → **success**
- `Apply Supabase migrations (development)` → **success**, including `Link Supabase project (development)` and `Apply migrations` both succeeding against the real `shopping-list-dev` project (ref `wfattbxpmugzhqzqharc`)
- `Apply Supabase migrations (production)` → correctly skipped (this was a push to `develop`, not `main`)

This is real, current, external evidence — not something I can fabricate — that **all 6 migrations, including the one containing the invite RPC, are actually deployed on the real dev Supabase project as of today.**

I also checked `main` (production): its current HEAD (`8876809`, from 2026-07-17, unchanged since — correctly, per your standing instruction not to merge `develop` into `main`) already includes the `list_sharing_and_roles` migration and the `InviteMemberModal`/`InviteByEmailForm` code. Production has the feature too, just an earlier revision of the surrounding UI.

## What this most likely is instead

Given everything above works, and given you specifically asked me to check "Email sending" and "Accept invitation flow" — two things that **do not exist in this app's actual design** — the most likely explanation is a **product-behavior mismatch, not a bug**: Email Invite only works if the person you're inviting **already has an account** in this app. If you type an email address for someone who hasn't signed up yet, you get "לא נמצא משתמש/ת עם כתובת האימייל הזו" (no user found) — which, from the outside, looks exactly like "the feature is broken," especially if you're expecting it to behave like a normal email-invitation system (send mail → recipient clicks a link → recipient accepts). That flow has never existed here; **Share Link** (also in the same modal) is this app's actual mechanism for inviting someone who doesn't have an account yet.

Two things I genuinely cannot verify from this sandbox, and which are the next place to look if the above isn't it:
1. **Whether your deployed frontend's `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (Vercel Preview/Production env vars) actually point at the project you expect.** No Vercel API access here.
2. **A stale PWA service worker** in your browser serving old JS. This app registers a service worker (`vite-plugin-pwa`, `registerType: 'autoUpdate'`) — a hard refresh (or clearing site data) rules this out in about 10 seconds.

## What I did NOT change

No code, migrations, or configuration were modified as part of this investigation — everything above was observed, not fixed, because nothing reproducibly broken was found. If you can tell me exactly what you see when it fails (the specific email you tried, whether an error message appears and what it says, and which URL/environment you're testing on — localhost, a Vercel preview, or the production domain), I can pin down the actual cause immediately instead of guessing further.
