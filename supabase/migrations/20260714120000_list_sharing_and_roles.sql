-- PHASE 6A: List Sharing & Invitations.
--
-- Adds real email-based invitations and owner/member roles on top of
-- the existing lists/list_members schema, without altering any
-- existing table, column, or policy.
--
-- Why a profiles table: the client can never query auth.users directly
-- (Supabase does not expose it over the API, by design), so there is
-- no way to resolve "invite by email" or display a member's email
-- without a public-schema mirror of id -> email. This table exists
-- solely for that purpose - it holds nothing auth.users doesn't
-- already have, and only ever gets rows via the trigger/backfill
-- below, never a client insert.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(lower(email));

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

alter table public.profiles enable row level security;

-- A user can see their own profile, or the profile of anyone they
-- share at least one list with (needed to show member emails on the
-- Family Members screen). SECURITY DEFINER, same mechanism as
-- is_list_owner/is_list_member, to avoid RLS self-reference issues
-- since this checks list_members from a different table's policy.
create or replace function public.shares_list_with(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.list_members lm1
    join public.list_members lm2 on lm1.list_id = lm2.list_id
    where lm1.user_id = auth.uid() and lm2.user_id = p_user_id
  );
$$;

revoke all on function public.shares_list_with(uuid) from public;
grant execute on function public.shares_list_with(uuid) to authenticated;

drop policy if exists "profiles_select_self_or_listmate" on public.profiles;
create policy "profiles_select_self_or_listmate"
  on public.profiles for select
  using (auth.uid() = id or public.shares_list_with(id));

-- ---------------------------------------------------------------------
-- list_members.role
-- Explicit per-membership role rather than only inferring "owner" from
-- lists.owner_id, so the frontend and RLS can both work off one clear
-- column. Existing rows are backfilled from lists.owner_id - the
-- owner's own membership row (already created by createList/
-- create_default_list_for_user) becomes role='owner', every other
-- existing row is already 'member' via the column default.
-- ---------------------------------------------------------------------
alter table public.list_members
  add column if not exists role text not null default 'member';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'list_members_role_check' and conrelid = 'public.list_members'::regclass
  ) then
    alter table public.list_members
      add constraint list_members_role_check check (role in ('owner', 'member'));
  end if;
end $$;

update public.list_members lm
set role = 'owner'
from public.lists l
where l.id = lm.list_id and l.owner_id = lm.user_id and lm.role <> 'owner';

-- ---------------------------------------------------------------------
-- Backfill profiles for every existing auth.users row, then extend the
-- signup bootstrap so every new user gets a profile row too.
-- ---------------------------------------------------------------------
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function public.create_profile_for_user(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (p_user_id, p_email)
  on conflict (id) do update set email = excluded.email;
end;
$$;

revoke all on function public.create_profile_for_user(uuid, text) from public;

-- Re-create the existing bootstrap trigger function to also create a
-- profile row, in the same error-swallowing block as the default-list
-- bootstrap it already does (see 20260713090000's own comment on why
-- failures here must not roll back the auth.users insert itself).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.create_default_list_for_user(new.id);
  exception when others then
    raise warning 'handle_new_user: failed to bootstrap default list for user %: %', new.id, sqlerrm;
  end;

  begin
    perform public.create_profile_for_user(new.id, new.email);
  exception when others then
    raise warning 'handle_new_user: failed to create profile for user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- invite_member_by_email
-- Owner-only, resolves email -> user_id via profiles (never exposes
-- auth.users to the client), inserts the membership if the user exists
-- and isn't already a member. Distinguishable exception messages so
-- the frontend can show a specific friendly error instead of a generic
-- failure.
-- ---------------------------------------------------------------------
create or replace function public.invite_member_by_email(p_list_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_list_owner(p_list_id) then
    raise exception 'not_owner';
  end if;

  select id into target_user_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if target_user_id is null then
    raise exception 'user_not_found';
  end if;

  if exists (
    select 1 from public.list_members
    where list_id = p_list_id and user_id = target_user_id
  ) then
    raise exception 'already_member';
  end if;

  insert into public.list_members (list_id, user_id, role)
  values (p_list_id, target_user_id, 'member');

  return target_user_id;
end;
$$;

revoke all on function public.invite_member_by_email(uuid, text) from public;
grant execute on function public.invite_member_by_email(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime for list_members: membership changes (invite/remove) now
-- show up live, matching the existing items/categories behavior -
-- additive, does not touch the existing items/categories publication
-- entries.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_members'
  ) then
    alter publication supabase_realtime add table public.list_members;
  end if;
end $$;
