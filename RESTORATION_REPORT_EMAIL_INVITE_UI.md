# Restoration Report: "Add Registered User by Email" UI

**Commit:** `b9a1ba7` on `fix/restore-invite-and-dev-settings`

## Which files were restored

| File | Change |
|---|---|
| `src/components/shopping/InviteMemberModal.tsx` | **Restored byte-for-byte** from `claude/app-design-branch-8hyo9t` (diffed first, then copied verbatim — not rewritten). Removed the `useDevTools()`/`featureFlags.enableEmailInvite` conditional that had been wrapped around the email section. Both **Share Link** and **Add Registered User by Email** now render unconditionally again, exactly as before. |
| `src/devtools/FeatureFlags/store.ts` | Removed the `enableEmailInvite` field (now dead — nothing reads it). |
| `src/devtools/FeatureFlags/FeatureFlagsSection.tsx` | Removed the "Email Invite" toggle row from the Developer Console (it no longer controlled anything). |
| `src/devtools/DeveloperConsole/ConsolePanel.tsx` | Removed the matching stale entry from the Feature Flags section's search-visibility list. |
| `e2e/dev-settings.spec.ts` | Replaced the old "disabling the flag hides the form" test with a **regression guard**: Email Invite must render even if a stale `enableEmailInvite:false` value is still sitting in a browser's `localStorage`. |

**Not touched, verified unchanged:** `InviteByEmailForm.tsx`, `InviteLinkCard.tsx` — confirmed byte-identical to `claude/app-design-branch-8hyo9t` before making any change. All of their existing loading state, success message, error message, and validation logic is exactly what it was; nothing needed restoring there because nothing there was ever modified.

## Why the UI disappeared

**Not the merge.** I want to be precise here because it matters for trusting this fix: the merge into `develop` never touched this. I verified that exhaustively in the prior investigation (real end-to-end runtime testing against a live local Supabase stack, on both branches) and found nothing wrong.

The actual cause was introduced **afterward, by my own work on this branch** (`fix/restore-invite-and-dev-settings`), while building the Developer Console feature-flags system. I added a dev/QA toggle, `enableEmailInvite`, and wrapped it around the email section in `InviteMemberModal.tsx`. It **defaulted to `true`** (so it didn't break anything by itself), but its mere existence meant that if a browser's `localStorage` ever held `dev-settings:featureFlags` with `enableEmailInvite: false` — from earlier QA/testing in the Developer Console, or any stale value — the email section would silently vanish from that browser, permanently, until someone knew to go flip it back. That's indistinguishable, from the outside, from "the feature broke."

This was a real design mistake on my part: a core, always-needed feature should never have been made conditionally hideable by a dev-only setting in the first place. The fix removes that risk entirely rather than just resetting the flag's value — there's no longer a flag that can do this.

## Confirmation: no backend code was changed

Confirmed no changes to:
- `supabase/migrations/` — untouched.
- The `invite_member_by_email` RPC — untouched (it's defined entirely in `20260714120000_list_sharing_and_roles.sql`, not modified).
- RLS policies — untouched.
- No new API endpoints, no invitation tokens, no email-sending code, no new invitation system of any kind were added. This was a pure UI fix: one file restored, one dead toggle removed.

## Confirmation: the existing RPC is reused, unchanged

The call chain is exactly what it was before: `InviteByEmailForm` → its `onInvite` prop → `InviteMemberModal`'s `onInvite` prop → `useMembers().inviteMember(email)` → `supabase.rpc('invite_member_by_email', { p_list_id, p_email })`. Nothing in that chain was touched by this fix — only the *rendering condition* around the form that calls into it.

## Verification

- **Visual:** screenshotted the invite modal against mocked data — both "קישור הזמנה למשפחה" (Share Link) and "הזמנה באימייל" (Email Invite, with its input + "הוסף/י" button) render together, side by side, exactly as designed.
- **`npx tsc --noEmit`** — clean.
- **`npm run lint`** — clean.
- **`npm run build`** (standard, no dev flag) — succeeds; confirmed the email-invite Hebrew text ("הזמנה באימייל") is present unconditionally in the shipped bundle (previously it still would have been, since the flag defaulted true — the point of this fix is that it can no longer be turned off by a stray browser state, not that it was missing from this particular build).
- **Playwright, both projects — 36/36 passed**, including the new regression-guard test proving the email section survives even a deliberately-poisoned `localStorage` value, and the existing `invite.spec.ts` suite (email invite success, non-existent-user error, non-owner permission check) — all still passing, confirming no regression in the RPC call path.
- Two flaky failures appeared in the first full run (`boundingBox()` returning null on a swipe-drag test, unrelated to invite functionality) and did not reproduce on immediate rerun in isolation or in a second full clean run — confirmed as pre-existing test timing flakiness, not something this change introduced.

## What's next

This is committed and pushed to `fix/restore-invite-and-dev-settings`, not merged into `develop` — same as the rest of this branch's work, awaiting your go-ahead.
