// supabase/tests/invite_authorization.mjs
//
// Regression test for the non-owner invite-authorization fix: a
// non-owner member of a shared list must not be able to create
// invitations (by email or by link) even by calling the RPCs or the
// underlying tables directly, bypassing the UI entirely. The UI fix
// (hiding "Invite by Email" and the invite-link controls for
// non-owners) has no server-side teeth on its own - this verifies the
// actual enforcement, which was already in place before the UI fix
// (invite_member_by_email / create_invite_link both raise `not_owner`
// server-side, list_members' insert policy is owner-only, and
// invite_links has no insert policy at all) and must stay that way.
//
// Same rationale as invite_links_concurrency.mjs for why this can't be
// a Playwright test: e2e/ runs against fully-mocked REST endpoints
// (see e2e/fixtures.ts) with no real Postgres/RLS behind them to
// actually enforce anything.
//
// Prerequisites: a running local stack (`npx supabase start`, or
// `npx supabase db reset` if it's already running) on the default
// local ports/keys. Run with: node supabase/tests/invite_authorization.mjs
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:54321';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

let failures = 0;
function check(label, condition) {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) failures += 1;
  console.log(`[${status}] ${label}`);
}

const ts = Date.now();
const owner = createClient(URL, ANON_KEY);
const member = createClient(URL, ANON_KEY);
const outsider = createClient(URL, ANON_KEY);
const password = 'Password123!';

const ownerEmail = `authz-owner-${ts}@example.com`;
const memberEmail = `authz-member-${ts}@example.com`;
const outsiderEmail = `authz-outsider-${ts}@example.com`;

const { data: ownerSignup, error: ownerErr } = await owner.auth.signUp({ email: ownerEmail, password });
if (ownerErr) throw ownerErr;
const { data: memberSignup, error: memberErr } = await member.auth.signUp({ email: memberEmail, password });
if (memberErr) throw memberErr;
const { data: outsiderSignup, error: outsiderErr } = await outsider.auth.signUp({ email: outsiderEmail, password });
if (outsiderErr) throw outsiderErr;

const { data: ownerLists } = await owner.from('lists').select('id').eq('owner_id', ownerSignup.user.id);
const listId = ownerLists[0].id;

// ---- Setup: owner invites `member` by email, a real (not bypassed) invite ----
const { error: setupInviteErr } = await owner.rpc('invite_member_by_email', {
  p_list_id: listId,
  p_email: memberEmail,
});
check('setup: owner can invite the member by email', !setupInviteErr);

const { data: memberRowsAfterSetup } = await owner
  .from('list_members')
  .select('id, role')
  .eq('list_id', listId)
  .eq('user_id', memberSignup.user.id);
check('setup: member row now exists with role=member', memberRowsAfterSetup?.[0]?.role === 'member');

// ---- Non-owner cannot invite by email via the RPC ----
const { error: memberInviteErr } = await member.rpc('invite_member_by_email', {
  p_list_id: listId,
  p_email: outsiderEmail,
});
check('non-owner invite_member_by_email is rejected', !!memberInviteErr);
check('non-owner invite_member_by_email fails with not_owner, not a raw DB error', memberInviteErr?.message === 'not_owner');

const { data: outsiderNotInvited } = await owner
  .from('list_members')
  .select('id')
  .eq('list_id', listId)
  .eq('user_id', outsiderSignup.user.id);
check('non-owner invite_member_by_email did not actually add a row', (outsiderNotInvited ?? []).length === 0);

// ---- Non-owner cannot create an invite link via the RPC ----
const { error: memberCreateLinkErr } = await member.rpc('create_invite_link', { p_list_id: listId });
check('non-owner create_invite_link is rejected', !!memberCreateLinkErr);
check('non-owner create_invite_link fails with not_owner, not a raw DB error', memberCreateLinkErr?.message === 'not_owner');

// ---- Non-owner cannot bypass the RPC with a direct table insert ----
const { error: memberDirectMemberInsertErr } = await member
  .from('list_members')
  .insert({ list_id: listId, user_id: crypto.randomUUID(), role: 'member' });
check('non-owner cannot INSERT into list_members directly (RLS denies it)', !!memberDirectMemberInsertErr);

const { error: memberDirectLinkInsertErr } = await member
  .from('invite_links')
  .insert({ list_id: listId, token: `bypass-${ts}`, created_by: memberSignup.user.id });
check('non-owner cannot INSERT into invite_links directly (no insert policy exists at all)', !!memberDirectLinkInsertErr);

// ---- Owner is unaffected: can still invite and create a link ----
const { error: ownerCreateLinkErr } = await owner.rpc('create_invite_link', { p_list_id: listId });
check('owner can still create an invite link after the above attempts', !ownerCreateLinkErr);

const { error: ownerInviteOutsiderErr } = await owner.rpc('invite_member_by_email', {
  p_list_id: listId,
  p_email: outsiderEmail,
});
check('owner can still invite another member by email', !ownerInviteOutsiderErr);

// ---- Existing shared-list functionality remains unaffected for the non-owner member ----
const { data: memberVisibleItems, error: memberItemsErr } = await member.from('items').select('id').eq('list_id', listId);
check('non-owner member can still read the shared list\'s items', !memberItemsErr && Array.isArray(memberVisibleItems));

const { error: memberAddItemErr } = await member
  .from('items')
  .insert({ list_id: listId, user_id: memberSignup.user.id, name: 'test item from member' });
check('non-owner member can still add an item to the shared list', !memberAddItemErr);

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
