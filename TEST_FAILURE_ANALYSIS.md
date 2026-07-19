# Test Failure Analysis

Scope: `e2e/categories.spec.ts`, `e2e/invite.spec.ts`, `e2e/items.spec.ts`. These 3 files were the only pre-existing e2e failures unrelated to the Supabase migration issue, confirmed via `git stash` earlier in this branch's history to predate every Phase 1-3 change and fix in this session.

For each test: whether the app or the test was wrong, why it failed, and what was changed.

---

## `e2e/items.spec.ts` — already fixed, no changes needed this pass

All 3 tests in this file **currently pass**. Both items called out in "special attention" were real regressions, found and fixed in an earlier round of this session (before this specific request):

- **Duplicate "add item" buttons (duplicate `aria-label`)**: `QuickAddBar.tsx`'s inline submit button and `FloatingAddButton.tsx` both had `aria-label="add item"`, making them indistinguishable by accessible name even though they do different things (submit the quick-add field vs. open the full Add Item sheet). **Real regression** — fixed by renaming `QuickAddBar`'s button to `aria-label="quick add"`.
- **Completed item visual state**: separately, `ItemCard.tsx`'s swipeable row called `setPointerCapture()` unconditionally on every `pointerdown` (even a plain tap), which in Chromium retargets the resulting synthetic `click` to the capturing row div instead of the tapped button - silently swallowing checkbox taps, so an item could never actually be marked done via a normal click. **Real regression** — confirmed by reproducing it three ways (normal click, forced click, and a raw native DOM `.click()` that bypasses the pointer-event pipeline and did work) before fixing it by deferring `setPointerCapture` to `handlePointerMove`, only once real drag movement (≥4px) is confirmed.

Verified passing again as part of this review (see Verification section below) — nothing further required here.

---

## `e2e/categories.spec.ts` — test was outdated, app is correct

### Failure
```
Error: expect(locator).toBeVisible() failed
Locator: locator('#new-category-input')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

### Why it failed
The Categories page was intentionally redesigned earlier in this session (a card-grid layout replacing the old always-visible inline `<input id="new-category-input">` + list) into `CategoriesPage.tsx` + `CategoryCard.tsx` + `CategorySheet.tsx`. Category creation now happens behind a "+ חדשה" header button that opens a `CategorySheet` (a `BottomSheet`), not an inline row. The test was never updated after that redesign - `#new-category-input` has not existed on this page for several commits.

### Verdict
**Application is correct. Test was outdated.**

### Fix
Rewrote the test to match the actual current flow: click the header's "+ חדשה" button (`exact: true`, since the empty-state's own action button and the dashed "add tile" both also contain the substring "חדשה" and would otherwise ambiguously match), fill the sheet's input (targeted by its placeholder, `שם הקטגוריה`, since it has no `id`), click "שמירה" ("Save"), and assert the new category name renders as plain text in its `CategoryCard` (previously the assertion checked an `<input>` value, since the old UI kept categories in always-editable input rows - that data shape doesn't exist anymore either).

---

## `e2e/invite.spec.ts` — two tests had a stale test string; one had a real regression

### Failures (tests 1 & 2)
```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('הזמן חבר')
```

### Why they failed
`FamilyMembers.tsx` was also redesigned earlier this session (hero card + member list, `FamilyHeroCard.tsx`). The invite trigger now lives inside `FamilyHeroCard` with the label `"הזמנת בן משפחה"` - the old `"הזמן חבר"` copy was replaced along with the rest of the page's structure. The tests were never updated.

### Verdict (tests 1 & 2)
**Application is correct. Tests were outdated.**

### Fix (tests 1 & 2)
Replaced `page.getByText('הזמן חבר')` with `page.getByText('הזמנת בן משפחה')` in both tests. Everything downstream (the modal's `input[type="email"]`, the `/הוסף\/י/` submit button, the success/error copy) was unaffected by the redesign and needed no changes.

### Test 3 — "a non-owner member does not see invite or remove controls": a real regression, caught by investigating a passing test

This test was **passing**, but for the wrong reason: it asserted
```ts
await expect(page.getByText('הזמן חבר')).not.toBeVisible();
```
`"הזמן חבר"` doesn't exist anywhere on the page anymore, for *any* role - so this assertion was vacuously true regardless of whether a non-owner could actually see the real invite button. It never verified what it claimed to.

Investigating what the *correct* assertion (`getByText('הזמנת בן משפחה')`) would find revealed the actual bug: **`FamilyHeroCard.tsx` renders its invite button unconditionally** - `isOwner` is computed in `FamilyMembers.tsx` and used to gate the "remove member" 🗑️ button, but was never threaded through to the invite button at all. A non-owner could see and click "הזמנת בן משפחה," open the invite modal, and only find out they lacked permission after submitting (the `invite_member_by_email` RPC already rejects non-owners server-side with a `not_owner` error) - a real UX regression introduced when this page was rebuilt, silently masked by the test's stale string ever since.

### Verdict (test 3)
**Application regressed. Fixed the application, not just the test.**

### Fix (test 3)
- `FamilyHeroCard.tsx`: added an optional `showInvite` prop (default `true`, so this stays backward-compatible for any future caller), wrapping the invite `<button>` in `{showInvite && (...)}`.
- `FamilyMembers.tsx`: passes `showInvite={isOwner}` - the same `isOwner` value already used for the remove-member gate.
- Updated the test's assertion to check the real, current label (`"הזמנת בן משפחה"`) instead of the stale one, so it now actually verifies the fixed behavior instead of passing by accident.

---

## Accessibility note

None of these fixes touch `aria-label`s, focus order, or keyboard interaction beyond what was already correct. The one interaction-affecting change (`showInvite`) hides a button entirely for non-owners rather than disabling it in place - consistent with how "remove member" is already hidden (not just disabled) for the same audience, so the pattern is consistent across the page.

---

## Verification

- `tsc --noEmit`: clean
- `npm run build`: clean
- `npm run lint`: clean (0 warnings, 0 errors)
- Full Playwright suite: **24 passed, 0 failed** (up from 21 passed / 3 failed before this pass)

No tests were skipped, disabled, or suppressed. No `test.skip`/`test.fixme` was introduced anywhere - every previously-failing test either now passes against a corrected assertion, or (test 3 in `invite.spec.ts`) passes because the underlying application bug it silently missed was fixed.

## Files changed

- `e2e/categories.spec.ts` — rewrote the create-category test for the current sheet-based flow.
- `e2e/invite.spec.ts` — fixed the stale invite-trigger string in 2 tests; fixed test 3's assertion to check the real label.
- `src/components/shopping/FamilyHeroCard.tsx` — added `showInvite` prop, gating the invite button's render.
- `src/pages/FamilyMembers.tsx` — passes `showInvite={isOwner}` (reusing the existing `isOwner` value already used for the remove-member gate).
