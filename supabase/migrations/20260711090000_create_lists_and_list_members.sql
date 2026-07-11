-- Phase 1B: introduce collaborative lists.
-- Creates the `lists` and `list_members` tables plus their RLS policies.
-- Purely additive: does not touch `items`, `categories`, or their existing policies.

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

alter table public.lists enable row level security;
alter table public.list_members enable row level security;

-- `lists` and `list_members` policies each need to check the other table
-- (is this user a member of this list? / does this user own this list?).
-- Doing that with a plain subquery creates a two-table RLS cycle
-- (lists -> list_members -> lists -> ...) that Postgres rejects as
-- infinite recursion. The standard fix (per Supabase's own guidance) is a
-- pair of SECURITY DEFINER helper functions: owned by the migration role
-- (which bypasses RLS), so the lookup inside them does not re-trigger the
-- calling table's policy.
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

-- lists: readable by the owner or any member; writable (insert/update/delete) by the owner only.
drop policy if exists "lists_select_owner_or_member" on public.lists;
create policy "lists_select_owner_or_member"
  on public.lists for select
  using (
    auth.uid() = owner_id
    or public.is_list_member(id)
  );

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

-- list_members: a user sees their own membership rows, or all members of a
-- list they own.
drop policy if exists "list_members_select_self_or_owner" on public.list_members;
create policy "list_members_select_self_or_owner"
  on public.list_members for select
  using (
    auth.uid() = user_id
    or public.is_list_owner(list_id)
  );

-- Only the list owner can add members ("owners can manage members").
drop policy if exists "list_members_insert_owner_only" on public.list_members;
create policy "list_members_insert_owner_only"
  on public.list_members for insert
  with check (public.is_list_owner(list_id));

-- The owner can remove any member; a member can remove themselves (leave list).
drop policy if exists "list_members_delete_owner_or_self" on public.list_members;
create policy "list_members_delete_owner_or_self"
  on public.list_members for delete
  using (
    auth.uid() = user_id
    or public.is_list_owner(list_id)
  );
