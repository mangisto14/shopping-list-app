// supabase/tests/invite_links_concurrency.mjs
//
// Regression test for two concurrency bugs found in code review and
// fixed in 20260726100000_invite_links_concurrency_fixes.sql:
//
//   1. create_invite_link took no lock around its check-then-insert,
//      so concurrent calls for the same list could each find "no
//      active link yet" and each insert their own token, leaving more
//      than one simultaneously-active link for one list.
//   2. join_list_by_token used a separate EXISTS check before its
//      INSERT, so concurrent calls from the same user could both pass
//      the check and race on list_members' unique(list_id, user_id)
//      constraint - the loser saw a raw Postgres unique_violation
//      instead of the friendly already_member error.
//
// This can't be expressed as a Playwright test: the rest of e2e/ runs
// against fully-mocked REST endpoints (see e2e/fixtures.ts), which has
// no real Postgres behind it to race against. This talks to a real
// local Supabase stack instead, via the same supabase-js client the
// app itself uses - genuine concurrent HTTP requests, not simulated.
//
// Prerequisites: a running local stack (`npx supabase start`, or
// `npx supabase db reset` if it's already running) on the default
// local ports/keys. Run with: node supabase/tests/invite_links_concurrency.mjs
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:54321';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CONCURRENCY = 10;

let failures = 0;
function check(label, condition) {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) failures += 1;
  console.log(`[${status}] ${label}`);
}

const ts = Date.now();
const owner = createClient(URL, ANON_KEY);
const joiner = createClient(URL, ANON_KEY);
const password = 'Password123!';

const { data: ownerSignup, error: ownerErr } = await owner.auth.signUp({
  email: `conc-owner-${ts}@example.com`,
  password,
});
if (ownerErr) throw ownerErr;
const { data: joinerSignup, error: joinerErr } = await joiner.auth.signUp({
  email: `conc-joiner-${ts}@example.com`,
  password,
});
if (joinerErr) throw joinerErr;

const { data: ownerLists } = await owner.from('lists').select('id').eq('owner_id', ownerSignup.user.id);
const listId = ownerLists[0].id;

// ---- create_invite_link: CONCURRENCY simultaneous calls, same list ----
const createResults = await Promise.all(
  Array.from({ length: CONCURRENCY }, () => owner.rpc('create_invite_link', { p_list_id: listId }))
);
check(
  'all concurrent create_invite_link calls succeeded',
  createResults.every((r) => !r.error)
);
const tokens = createResults.map((r) => (Array.isArray(r.data) ? r.data[0].token : r.data.token));
check('all concurrent calls agree on a single token', new Set(tokens).size === 1);

const { data: activeLinks } = await owner
  .from('invite_links')
  .select('id')
  .eq('list_id', listId)
  .is('revoked_at', null);
check('exactly one active invite_links row exists for the list', activeLinks.length === 1);

const token = tokens[0];

// ---- join_list_by_token: CONCURRENCY simultaneous calls, same user ----
const joinResults = await Promise.all(
  Array.from({ length: CONCURRENCY }, () => joiner.rpc('join_list_by_token', { p_token: token }))
);
const joinErrorMessages = joinResults.map((r) => r.error?.message ?? null);
check('exactly one concurrent join call succeeded', joinErrorMessages.filter((m) => m === null).length === 1);
check(
  'every other call got the friendly already_member error, not a raw DB error',
  joinErrorMessages.filter((m) => m !== null).every((m) => m === 'already_member')
);

const { data: memberRows } = await owner
  .from('list_members')
  .select('id')
  .eq('list_id', listId)
  .eq('user_id', joinerSignup.user.id);
check('exactly one list_members row exists for the joiner (no duplicate)', memberRows.length === 1);

// ---- revoke_invite_link: still generates a fresh link afterward ----
const { error: revokeErr } = await owner.rpc('revoke_invite_link', { p_list_id: listId });
check('revoke_invite_link succeeds', !revokeErr);
const { data: afterRevoke, error: afterRevokeErr } = await owner.rpc('create_invite_link', { p_list_id: listId });
check('create_invite_link after revoke succeeds', !afterRevokeErr);
const newToken = Array.isArray(afterRevoke) ? afterRevoke[0].token : afterRevoke.token;
check('the post-revoke token differs from the revoked one', newToken !== token);

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
