// supabase/tests/member_removal_authorization.mjs
//
// Regression/authorization test for member removal on the Family
// Members screen: a non-owner member must not be able to remove
// another member (or the owner) via a direct table call, bypassing the
// UI entirely. The UI fix (hiding the remove action for non-owners,
// and for the owner's own row) has no server-side teeth on its own -
// this verifies the actual enforcement, which was already in place
// before the UI fix (list_members' delete policy is
// "auth.uid() = user_id or is_list_owner(list_id)" - a user may always
// remove their own row, i.e. leave, but only the owner may remove
// someone else's) and must stay that way.
//
// Same rationale as invite_links_concurrency.mjs / invite_authorization.mjs
// for why this can't be a Playwright test: e2e/ runs against fully-mocked
// REST endpoints (see e2e/fixtures.ts) with no real Postgres/RLS behind
// them to actually enforce anything.
//
// Prerequisites: a running local stack (`npx supabase start`, or
// `npx supabase db reset` if it's already running) on the default
// local ports/keys. Run with: node supabase/tests/member_removal_authorization.mjs
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
const memberA = createClient(URL, ANON_KEY);
const memberB = createClient(URL, ANON_KEY);
const password = 'Password123!';

const ownerEmail = `mrmv-owner-${ts}@example.com`;
const memberAEmail = `mrmv-a-${ts}@example.com`;
const memberBEmail = `mrmv-b-${ts}@example.com`;

const { data: ownerSignup, error: ownerErr } = await owner.auth.signUp({ email: ownerEmail, password });
if (ownerErr) throw ownerErr;
const { data: memberASignup, error: memberAErr } = await memberA.auth.signUp({ email: memberAEmail, password });
if (memberAErr) throw memberAErr;
const { data: memberBSignup, error: memberBErr } = await memberB.auth.signUp({ email: memberBEmail, password });
if (memberBErr) throw memberBErr;

const { data: ownerLists } = await owner.from('lists').select('id').eq('owner_id', ownerSignup.user.id);
const listId = ownerLists[0].id;

const { error: inviteAErr } = await owner.rpc('invite_member_by_email', { p_list_id: listId, p_email: memberAEmail });
check('setup: owner can invite member A', !inviteAErr);
const { error: inviteBErr } = await owner.rpc('invite_member_by_email', { p_list_id: listId, p_email: memberBEmail });
check('setup: owner can invite member B', !inviteBErr);

// ---- Non-owner cannot remove another member ----
const { error: aRemovesBErr } = await memberA.from('list_members').delete().eq('list_id', listId).eq('user_id', memberBSignup.user.id);
check('non-owner (member A) cannot remove another member (member B) - RLS denies it', !!aRemovesBErr);

const { data: bStillThere } = await owner
  .from('list_members')
  .select('id')
  .eq('list_id', listId)
  .eq('user_id', memberBSignup.user.id);
check('member B is still a member after the rejected attempt', (bStillThere ?? []).length === 1);

// ---- Non-owner cannot remove the owner ----
const { error: aRemovesOwnerErr } = await memberA.from('list_members').delete().eq('list_id', listId).eq('user_id', ownerSignup.user.id);
check('non-owner (member A) cannot remove the owner - RLS denies it', !!aRemovesOwnerErr);

const { data: ownerStillThere } = await owner
  .from('list_members')
  .select('id')
  .eq('list_id', listId)
  .eq('user_id', ownerSignup.user.id);
check('the owner is still a member after the rejected attempt', (ownerStillThere ?? []).length === 1);

// ---- Owner can remove another member ----
const { error: ownerRemovesBErr } = await owner.from('list_members').delete().eq('list_id', listId).eq('user_id', memberBSignup.user.id);
check('owner can remove another member (member B)', !ownerRemovesBErr);

const { data: bGoneNow } = await owner
  .from('list_members')
  .select('id')
  .eq('list_id', listId)
  .eq('user_id', memberBSignup.user.id);
check('member B is actually gone after the owner removed them', (bGoneNow ?? []).length === 0);

// ---- Existing behavior preserved: a member may still remove themselves (leave) ----
const { error: aLeavesErr } = await memberA.from('list_members').delete().eq('list_id', listId).eq('user_id', memberASignup.user.id);
check('a member can still remove themselves (leave the list)', !aLeavesErr);

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
