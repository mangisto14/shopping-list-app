-- Initial schema baseline for the collaborative shopping list app.
--
-- This replaces the previous incremental migration history. That history
-- assumed `items`/`categories` already existed in the target database
-- (true of the original project this app was built against, whose
-- schema predates version control - see repo history) and is therefore
-- unusable against a fresh, empty Supabase project. This file derives
-- the complete schema directly from the application code (every
-- `.from(...)` call, every column referenced, every realtime
-- subscription) and creates everything from scratch. Safe to run via
-- `supabase db reset` on an empty database.
--
-- Tables: lists, list_members, items, categories, history.

-- ---------------------------------------------------------------------
-- lists / list_members
-- ---------------------------------------------------------------------
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My List',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (list_id, user_id)
);

create index if not exists idx_lists_owner_id on public.lists(owner_id);
create index if not exists idx_list_members_list_id on public.list_members(list_id);
create index if not exists idx_list_members_user_id on public.list_members(user_id);

-- ---------------------------------------------------------------------
-- categories / items
-- Fresh database, no legacy rows to migrate, so list_id/user_id are
-- NOT NULL from the start (the nullable-then-backfill approach in the
-- old migration history was only needed to avoid downtime on a
-- database that already had data).
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_list_id on public.categories(list_id);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_items_list_id on public.items(list_id);
create index if not exists idx_items_list_id_position on public.items(list_id, position);
create index if not exists idx_items_category_id on public.items(category_id);
create index if not exists idx_items_user_id on public.items(user_id);

-- ---------------------------------------------------------------------
-- history
-- Read-only from the application's perspective today (HistoryPage.tsx
-- only ever SELECTs; nothing in the codebase inserts into this table).
-- Still user-scoped, not list-scoped: the only query in the app filters
-- by user_id, so that's what's built here rather than guessing a
-- list_id relationship the code gives no evidence of.
-- ---------------------------------------------------------------------
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_history_user_id_created_at on public.history(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Helper functions for RLS. SECURITY DEFINER + owned by a role that
-- bypasses RLS (the migration-running role) so that lists' and
-- list_members' policies can check each other without the two-table RLS
-- cycle that raw subqueries would create ("infinite recursion detected
-- in policy").
-- ---------------------------------------------------------------------
create or replace function public.is_list_owner(p_list_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.lists
    where id = p_list_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_list_member(p_list_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.list_members
    where list_id = p_list_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_list_owner(uuid) from public;
revoke all on function public.is_list_member(uuid) from public;
grant execute on function public.is_list_owner(uuid) to authenticated;
grant execute on function public.is_list_member(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Table grants for the authenticated role. Supabase projects normally
-- configure default privileges so new tables are automatically
-- reachable by anon/authenticated, but this baseline grants explicitly
-- rather than relying on that being correctly set up on whatever
-- project it runs against - RLS above is still what actually restricts
-- row-level access. history is select-only, matching the one query the
-- app performs against it.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.lists, public.list_members, public.categories, public.items
  to authenticated;
grant select on public.history to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.history enable row level security;

-- lists: owner or member can read; only the owner can write.
drop policy if exists "lists_select_owner_or_member" on public.lists;
create policy "lists_select_owner_or_member"
  on public.lists for select
  using (auth.uid() = owner_id or public.is_list_member(id));

drop policy if exists "lists_insert_self_as_owner" on public.lists;
create policy "lists_insert_self_as_owner"
  on public.lists for insert
  with check (auth.uid() = owner_id);

drop policy if exists "lists_update_owner_only" on public.lists;
create policy "lists_update_owner_only"
  on public.lists for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "lists_delete_owner_only" on public.lists;
create policy "lists_delete_owner_only"
  on public.lists for delete
  using (auth.uid() = owner_id);

-- list_members: a user sees their own membership rows, or all members
-- of a list they own. Only the owner can add members; a member can
-- remove themselves (leave) and the owner can remove anyone.
drop policy if exists "list_members_select_self_or_owner" on public.list_members;
create policy "list_members_select_self_or_owner"
  on public.list_members for select
  using (auth.uid() = user_id or public.is_list_owner(list_id));

drop policy if exists "list_members_insert_owner_only" on public.list_members;
create policy "list_members_insert_owner_only"
  on public.list_members for insert
  with check (public.is_list_owner(list_id));

drop policy if exists "list_members_delete_owner_or_self" on public.list_members;
create policy "list_members_delete_owner_or_self"
  on public.list_members for delete
  using (auth.uid() = user_id or public.is_list_owner(list_id));

-- items / categories: membership is the only gate, for all four
-- operations. A list's owner is always also a list_members row (see
-- useLists.ts's createList), so no separate owner clause is needed.
drop policy if exists "items_select_list_member" on public.items;
create policy "items_select_list_member"
  on public.items for select
  using (public.is_list_member(list_id));

drop policy if exists "items_insert_list_member" on public.items;
create policy "items_insert_list_member"
  on public.items for insert
  with check (public.is_list_member(list_id));

drop policy if exists "items_update_list_member" on public.items;
create policy "items_update_list_member"
  on public.items for update
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

drop policy if exists "items_delete_list_member" on public.items;
create policy "items_delete_list_member"
  on public.items for delete
  using (public.is_list_member(list_id));

drop policy if exists "categories_select_list_member" on public.categories;
create policy "categories_select_list_member"
  on public.categories for select
  using (public.is_list_member(list_id));

drop policy if exists "categories_insert_list_member" on public.categories;
create policy "categories_insert_list_member"
  on public.categories for insert
  with check (public.is_list_member(list_id));

drop policy if exists "categories_update_list_member" on public.categories;
create policy "categories_update_list_member"
  on public.categories for update
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

drop policy if exists "categories_delete_list_member" on public.categories;
create policy "categories_delete_list_member"
  on public.categories for delete
  using (public.is_list_member(list_id));

-- history: read-only in the app today, so only a SELECT policy is
-- added - matching what the code actually does rather than guessing at
-- a write path that doesn't exist yet.
drop policy if exists "history_select_own" on public.history;
create policy "history_select_own"
  on public.history for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Realtime: items and categories only (the only tables the app
-- subscribes to - see src/hooks/useRealtimeTable.ts). Realtime respects
-- the RLS policies above automatically.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;
