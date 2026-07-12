# Archived migrations

These migrations are **not** in `supabase/migrations/` and are not run by
`supabase db reset` / `supabase db push`. They're kept here for reference
only.

They were superseded by `supabase/migrations/20260712120000_initial_schema.sql`,
a single consolidated baseline covering everything these five files did
(create `lists`/`list_members`, add `list_id` to `items`/`categories`,
the membership-based RLS cutover, and the Realtime publication).

Why they were retired rather than kept: they assumed `items` and
`categories` already existed in the target database - true of the
original project this app was built against (those two tables predate
version control), but not true of a fresh, empty Supabase project.
Since the project this repo now targets has no production data to
preserve, a single from-scratch baseline is simpler and correct for an
empty database, where the old incremental history is not.

The one file dropped entirely (not carried into the baseline) is
`20260711090200_backfill_default_lists.sql` - a one-time data backfill
for pre-existing users, which has nothing to do on a database with no
existing users.
