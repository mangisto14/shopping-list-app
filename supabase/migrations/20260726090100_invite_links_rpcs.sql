-- PHASE 2 (Real Share Link): RPCs on top of the invite_links table
-- from the previous migration. Same three-function shape as
-- invite_member_by_email: SECURITY DEFINER, owner-only checks done
-- inside the function body (not via RLS), distinguishable exception
-- messages so the frontend can map them to friendly errors.

-- ---------------------------------------------------------------------
-- create_invite_link: owner-only. Idempotent - returns the existing
-- active (non-revoked, non-expired) link for the list if one exists,
-- otherwise generates a new token and inserts it. This is what makes
-- "one active link per list" hold in practice without a DB constraint
-- (see the schema migration's comment on why a partial unique index
-- can't express that here).
-- ---------------------------------------------------------------------
create or replace function public.create_invite_link(p_list_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  if not public.is_list_owner(p_list_id) then
    raise exception 'not_owner';
  end if;

  select il.token, il.expires_at
  into v_token, v_expires_at
  from public.invite_links il
  where il.list_id = p_list_id
    and il.revoked_at is null
    and il.expires_at > now()
  order by il.created_at desc
  limit 1;

  if v_token is null then
    -- 24 bytes -> 48 hex chars, 192 bits of entropy. Collision against
    -- the `token` unique constraint is astronomically unlikely - not
    -- worth a retry loop.
    v_token := encode(gen_random_bytes(24), 'hex');

    insert into public.invite_links (list_id, token, created_by)
    values (p_list_id, v_token, auth.uid())
    returning invite_links.expires_at into v_expires_at;
  end if;

  return query select v_token, v_expires_at;
end;
$$;

revoke all on function public.create_invite_link(uuid) from public;
grant execute on function public.create_invite_link(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- join_list_by_token: callable by any authenticated user (not
-- owner-gated - that's the entire point of a shareable link).
-- Distinguishes invalid / revoked / expired / already-member so the
-- frontend can show a specific message for each, same pattern as
-- invite_member_by_email's user_not_found/already_member/not_owner.
-- "Already used" (per the product requirement) is per-user, not
-- per-token: this link can be used by many different people, but the
-- same person can't join the same list twice through it.
-- ---------------------------------------------------------------------
create or replace function public.join_list_by_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id uuid;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
begin
  select il.list_id, il.revoked_at, il.expires_at
  into v_list_id, v_revoked_at, v_expires_at
  from public.invite_links il
  where il.token = p_token;

  if v_list_id is null then
    raise exception 'invalid_link';
  end if;

  if v_revoked_at is not null then
    raise exception 'revoked_link';
  end if;

  if v_expires_at <= now() then
    raise exception 'expired_link';
  end if;

  if exists (
    select 1 from public.list_members
    where list_id = v_list_id and user_id = auth.uid()
  ) then
    raise exception 'already_member';
  end if;

  insert into public.list_members (list_id, user_id, role)
  values (v_list_id, auth.uid(), 'member');

  return v_list_id;
end;
$$;

revoke all on function public.join_list_by_token(text) from public;
grant execute on function public.join_list_by_token(text) to authenticated;

-- ---------------------------------------------------------------------
-- revoke_invite_link: owner-only. Revokes every currently-active link
-- for the list (normally just one, per create_invite_link's own
-- idempotency, but this is safe even if more than one ever exists).
-- ---------------------------------------------------------------------
create or replace function public.revoke_invite_link(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_list_owner(p_list_id) then
    raise exception 'not_owner';
  end if;

  update public.invite_links
  set revoked_at = now()
  where list_id = p_list_id and revoked_at is null;
end;
$$;

revoke all on function public.revoke_invite_link(uuid) from public;
grant execute on function public.revoke_invite_link(uuid) to authenticated;
