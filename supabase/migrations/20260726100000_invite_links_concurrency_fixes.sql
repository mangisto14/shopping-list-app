-- Fixes two concurrency issues found in code review of the previous
-- two migrations, before this feature merges to develop. Redefines
-- both functions rather than editing the already-committed migrations
-- - same convention this project already follows (see e.g.
-- 20260723120000 redefining create_default_list_for_user instead of
-- editing 20260718090000).

-- ---------------------------------------------------------------------
-- create_invite_link: now takes a transaction-scoped advisory lock,
-- keyed on p_list_id, before the check-then-insert. Without this, two
-- concurrent calls for the same list could both pass the "no active
-- link exists yet" check before either commits its insert, and both
-- would then succeed (each generates its own random token, so nothing
-- else stops it) - leaving two simultaneously-active links for one
-- list, contradicting the "one active link per list" invariant.
--
-- pg_advisory_xact_lock blocks other backends requesting the *same*
-- key until this transaction ends (commit or rollback) - exactly the
-- lifetime of one PostgREST RPC call, so it serializes concurrent
-- create_invite_link calls for the same list without needing any
-- explicit unlock (auto-released), and never holds a lock past this
-- request. The two-argument int,int overload is used (rather than
-- hashing p_list_id into a single bigint by hand) with a fixed
-- namespace hash as the first key, so this can never collide with an
-- advisory lock some future, unrelated feature might take.
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

  perform pg_advisory_xact_lock(hashtext('create_invite_link'), hashtext(p_list_id::text));

  select il.token, il.expires_at
  into v_token, v_expires_at
  from public.invite_links il
  where il.list_id = p_list_id
    and il.revoked_at is null
    and il.expires_at > now()
  order by il.created_at desc
  limit 1;

  if v_token is null then
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
-- join_list_by_token: replaces the EXISTS-then-INSERT check with
-- INSERT ... ON CONFLICT DO NOTHING. The previous version's EXISTS
-- check and the INSERT that followed it were two separate statements -
-- two concurrent calls from the *same* user could both pass the EXISTS
-- check before either inserted, and the second insert would then hit
-- list_members' unique(list_id, user_id) constraint as a raw,
-- unmapped unique_violation - no data corruption (the constraint still
-- prevented a duplicate row), but the user got a generic "something
-- went wrong" instead of the correct, graceful "you're already a
-- member" message.
--
-- ON CONFLICT DO NOTHING makes the insert itself idempotent and atomic
-- - no separate check step to race against. GET DIAGNOSTICS then
-- reports whether a row was actually inserted; zero rows affected
-- means a matching (list_id, user_id) row already existed, which is
-- exactly the already_member case.
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
  v_inserted int;
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

  insert into public.list_members (list_id, user_id, role)
  values (v_list_id, auth.uid(), 'member')
  on conflict (list_id, user_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    raise exception 'already_member';
  end if;

  return v_list_id;
end;
$$;

revoke all on function public.join_list_by_token(text) from public;
grant execute on function public.join_list_by_token(text) to authenticated;
