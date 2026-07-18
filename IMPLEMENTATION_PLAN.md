# Implementation Plan — Shopping List UX/Functionality Pass

Status: **DRAFT — awaiting approval. No code changes have been made yet.**

Scope guardrails carried over from the request and honored throughout this plan:
- No changes to Authentication, Realtime wiring, Routing, or existing business rules unless explicitly called out below.
- Supabase schema changes only where a workstream genuinely requires one, called out explicitly with a migration.
- Everything else is UI/component/state-shape work reusing existing hooks.

Several of the 14 requested items were already implemented in earlier passes this session. This plan says so explicitly per item, so effort goes only into what's actually missing.

---

## Workstream A — Group Identical Products (item 1)

**Current state:** `items` has no `quantity` column. Each unit is its own row (`ItemCard.tsx` hardcodes `"1x"` because that's literally true today). The Quick Add "quantity" stepper already adds N separate rows via a loop in `ShoppingList.tsx`'s `addItem()`.

**Approach — client-side grouping, zero schema change** (this is what the request calls "the smallest possible change" for this item):
- Within each category group (existing `groupByCategory`), cluster not-done items by `name` (exact match). Render one row per cluster showing `count = cluster.length` as `Nx`.
- Toggling a clustered row's checkbox completes **one** underlying item (the first not-done row in the cluster) — this is the "decrement on completion" behavior. The cluster's displayed count drops by 1; when it hits 0 the cluster disappears from the to-buy section.
- Completed items are clustered the same way (by `name`) within the completed section, so 3 separately-completed "בצל" rows still collapse into one `3x בצל` completed row instead of three.
- Swipe-delete on a clustered row deletes one underlying unit (same decrement semantics as completion), not the whole cluster. I'll surface this as the default; flag it below as a decision point.
- Different names are never merged, per the explicit instruction — clustering key is exact `name` string, nothing fuzzy.

**Components affected:** `ShoppingList.tsx` (grouping logic), `ItemCard.tsx` (display + interaction).

**Files to modify:**
- `src/pages/ShoppingList.tsx` — add a `clusterByName()` step applied after `groupByCategory`, replacing the flat `group.items.map(...)` render with clustered rows; `handleToggle`/`deleteItem` calls target the cluster's "first eligible id," not a list of ids.
- `src/components/shopping/ItemCard.tsx` — accept a `count: number` prop instead of the hardcoded `QUANTITY_LABEL`; render `${count}x`.

**Backend changes:** None.

**Risks:**
- Swipe-to-delete on a clustered row now deletes only 1 unit, not the visible group — needs a clear UX signal (e.g., the row's count visibly decrements after a swipe) so it doesn't read as a bug. **Decision point for you:** should swipe-delete on a grouped row delete one unit (matches "decrement" wording) or the entire cluster? I'll implement "one unit" unless you tell me otherwise, since it mirrors the completion behavior the spec already specifies.
- Rename (tap-to-edit) on a clustered row is ambiguous — renaming would only make sense applied to one underlying row, but visually it looks like renaming "the group." I'll rename the same "first eligible id" the checkbox targets, but this is worth a second look after implementation.

**Migration strategy:** N/A — no migration.

---

## Workstream B — Default Categories for Every New List (item 2)

**Current state:** A signup trigger (`20260713090000_default_list_on_signup.sql`) seeds 8 categories, but only once per user at signup — not per new list. `useLists.createList()` (client-side) currently only inserts into `lists` and `list_members`. `Lists.tsx`/`CreateListModal.tsx` are the only paths that create lists in this app.

**Approach — extend `createList()` client-side, no migration:**
- After the `list_members` insert succeeds, insert the 9 requested categories (`🥛 מוצרי חלב`, `🥦 ירקות`, `🍎 פירות`, `🍞 מאפים`, `🥩 בשר ודגים`, `🥤 משקאות`, `🧊 קפואים`, `🧽 ניקיון`, `🛒 אחר`) in one batch insert against the existing `categories` table (RLS already permits list-member inserts).
- Guard against duplicates by construction, not by querying first: this only runs once, right after a brand-new list is created, so there's nothing to duplicate.
- Existing lists are untouched — this only fires on the create-list path.

Note: `categoryStyles.ts` already has styling for `מאפים ולחם` but not the shorter `מאפים` this request uses, and no icon-derived-differently issue since `getCategoryStyle` keys off the Hebrew name — I'll add a `מאפים` alias (or use `מאפים ולחם` in the seed list to match the existing signup trigger's naming, whichever you prefer — flagged below).

**Components affected:** none visually; this is a data-seeding change.

**Files to modify:**
- `src/hooks/useLists.ts` — extend `createList()` to insert the 9 default categories after list+member creation.
- `src/theme/categoryStyles.ts` — add a style entry for `מאפים` (or reuse `מאפים ולחם`'s entry as an alias) so the seeded category isn't stuck on the gray fallback.

**Backend changes:** None (no migration) — pure additional client-side insert against an existing table or RLS-permitted operation.

**Risks:**
- If `list_members` insert succeeds but the categories insert fails (network blip), the new list ends up with zero categories — same partial-failure shape `createList()` already has today between `lists` and `list_members` (it returns `null` on member-insert failure but doesn't roll back the list row). I'll follow the existing pattern (best-effort, not transactional) rather than introducing new rollback logic, since fixing that is out of scope here.
- **Decision point for you:** the signup trigger's 8-category set (`מאפים ולחם`, no `אחר`) and this request's 9-category set (`מאפים`, plus `אחר`) don't match. Should I (a) leave the signup trigger as-is and only use the new 9-category list for lists created after the first one, living with two slightly different "default" sets depending on how a list was created, or (b) also update the signup trigger's category list to the same 9 for consistency? I'd lean toward (b) for consistency, but it does touch a migration file (additive `create or replace function`, not a schema change, no new column/table) — flagging since you said schema changes need to be "absolutely required," and this isn't a schema change but is a SQL change.

**Migration strategy:** None required for the core ask. Only if you choose option (b) above: a small additive migration that does `create or replace function create_default_list_for_user(...)` with the updated 9-category list — no table/column changes, fully backward compatible with existing rows.

---

## Workstream C — Lists Screen: Rename / Manage Members / Archive / Delete (item 3)

**Current state:** `Lists.tsx` is a bare unstyled page (create-list form + plain `<ul>`, inline always-visible member list for the active list only). No rename, icon-change, archive, delete, or menu of any kind exists. `useLists.ts` only exposes `createList`; there's no `updateList`/`deleteList`/`archiveList`.

**What's already usable without any change:**
- **Rename**: `lists.name` exists; RLS policy `lists_update_owner_only` already permits the owner to update it. Just needs a hook function + UI.
- **Delete**: RLS policy `lists_delete_owner_only` already restricts this to the owner, matching the "owner only" requirement exactly. Just needs a hook function + UI + confirmation step.
- **Manage members (remove a member / leave a list)**: RLS policy `list_members_delete_owner_or_self` already permits the owner to remove any member, or a member to remove themselves. `useMembers.ts` already fetches real membership with emails (used today by `ShoppingHeader`/`InviteMemberModal`). Just needs a `removeMember` function + UI surfaced from the three-dot menu.
- **Icon change**: explicitly marked optional in the request, and `lists` has no emoji/icon column — the app's current icon is a derived, positional fallback (`EMOJI_PALETTE[i % ...]` in `ShoppingList.tsx`), not a persisted per-list value. Persisting a real custom icon needs a schema change. Given it's marked optional, **I recommend deferring this** rather than adding a column for it in this pass — flagged as a decision point below.
- **Archive**: no `archived` (or similar) column exists anywhere — this is the one piece of this workstream that genuinely needs a migration.

**Approach:**
- Add `three-dot menu` (▾) to each list row in `Lists.tsx`, opening a `BottomSheet` with actions: Rename, Manage Members, Archive/Unarchive, Delete (Delete only rendered for the owner).
- Rename: inline text input inside the sheet, calls a new `updateListName(id, name)` in `useLists.ts`.
- Manage Members: reuse `useMembers.ts` inside the sheet (or a dedicated sub-view) to list members with a "remove" action per row (owner) / "leave list" action (non-owner, self only).
- Delete: confirmation step inside the same sheet, then a new `deleteList(id)` in `useLists.ts`; if the deleted list was the active list, `ActiveListContext` needs to fall back to another list (its existing "stored id no longer valid" effect already does this automatically once `lists` refetches).
- Archive: new `archived boolean not null default false` column on `lists` (migration below). `useLists.fetchLists()` gets an `includeArchived` mode; the default list-switcher/active-list views exclude archived lists, `Lists.tsx` shows them in a separate collapsed "Archived" section with an "Unarchive" action. Archiving the active list falls back to another list, same mechanism as delete.

**Components affected:** `Lists.tsx` (rebuilt), a new `ListActionsSheet.tsx` (or similar) component, `useLists.ts`, `ActiveListContext.tsx` (expose the new functions), `useMembers.ts` (add a `removeMember` function if it doesn't already have one — needs a quick check during implementation).

**Files to modify:**
- `src/hooks/useLists.ts` — add `updateListName`, `deleteList`, `archiveList`/`unarchiveList`, and an `includeArchived` fetch option.
- `src/ActiveListContext.tsx` — thread the new functions through the context.
- `src/pages/Lists.tsx` — rebuild with three-dot menu per row, archived-section, styled to match the rest of the app (currently the one page in the app still using default unstyled Tailwind).
- New: `src/components/lists/ListActionsSheet.tsx` — the rename/members/archive/delete bottom sheet.
- `src/hooks/useMembers.ts` — verify/add member-removal function (read during implementation before assuming it's missing).

**Backend changes:** One migration — `archived` column + index; everything else (rename, delete, member removal) uses existing RLS policies with no changes.

**Risks:**
- Deleting a list cascades to its `items`/`categories`/`list_members`/`history` rows — need to confirm `ON DELETE CASCADE` is already set on those foreign keys (expected, since this is a normal multi-tenant schema pattern, but I'll verify against `20260712120000_initial_schema.sql` before wiring up the delete button rather than assuming).
- Archiving needs a decision on whether archived lists still sync Realtime updates in the background (probably fine either way since nobody's viewing them) — no change needed to Realtime, just exclude archived lists from the default list query.

**Migration strategy:**
```sql
alter table public.lists
  add column if not exists archived boolean not null default false;

create index if not exists idx_lists_archived on public.lists(archived);
```
Purely additive, defaults `false` for all existing rows (no behavior change for anyone until a list is explicitly archived), no RLS policy changes needed (existing `lists_update_owner_only` already covers writing to the new column).

**Decision point for you:** confirm you want icon-change deferred (recommended, since it's marked optional and needs a schema change to persist), or if you'd rather I add an `icon text` column in the same migration now while I'm already touching this table.

---

## Workstream D — Shopping List Layout Polish (items 4, 7, 12 — the genuinely new pieces)

**Item 4 — collapsible sections, remembered state, animation:**
- Collapse/expand state (`collapsedGroups` in `ShoppingList.tsx`) is already per-category and independent for to-buy vs. completed, but it's plain component state — lost on refresh. **Gap:** persist it to `localStorage` (same pattern `ActiveListContext` already uses for `activeListId`), keyed per list so switching lists doesn't bleed state across them.
- `CategorySection.tsx` currently shows/hides children instantly (no transition). **Gap:** add a smooth expand/collapse animation — CSS grid-rows technique (`grid-template-rows: 0fr` → `1fr` on a wrapper, content in an `overflow-hidden` inner div) so height animates without needing to measure `scrollHeight` in JS.
- "Hide empty categories" and "item count in header" are already implemented (`groupByCategory` drops empty groups; `CategorySection` already takes a `count` prop).

**Item 7 — compact row height + real quantity + strip:**
- Row height: current `ItemCard` padding (`px-3 py-2` on a `text-[15px]` row) needs to be measured against the 56–64px target and adjusted (likely a small `py-2.5`/`min-h-[60px]` change) — a byproduct of finishing Workstream A's quantity display anyway, since real counts replace the "1x" placeholder.
- Quantity display becomes real once Workstream A ships (`Nx` from cluster size, not hardcoded).
- Category color strip already exists (`w-1 self-stretch rounded-full ${style.strip}`) — already matches the "thin, full-row-height" requirement.
- "Remove attribution/avatar/badges" already done in an earlier pass.

**Item 12 — touch targets / native feel:**
- The checkbox (`w-[22px] h-[22px]`) is below the ~44px recommended tap target. **Gap:** add invisible hit-slop via a wrapping `button` with `min-w-[44px] min-h-[44px]` and the visible 22px circle centered inside it (padding, not a bigger visible circle) — keeps the compact visual density while making it easier to tap.
- "No layout jumps" — already addressed by the `pendingMoves` transition-delay mechanism (200ms grace period before a toggled item jumps sections).

**Components affected:** `CategorySection.tsx`, `ItemCard.tsx`, `ShoppingList.tsx` (localStorage persistence for collapse state).

**Files to modify:**
- `src/components/shopping/CategorySection.tsx` — grid-rows expand/collapse animation.
- `src/components/shopping/ItemCard.tsx` — checkbox hit-slop wrapper, row height/padding tweak.
- `src/pages/ShoppingList.tsx` — persist `collapsedGroups` to `localStorage` (key includes `activeListId`).

**Backend changes:** None.

**Risks:** Low — these are isolated, presentational changes to components already built this session.

**Migration strategy:** N/A.

---

## Workstream E — Already Implemented, Verify-Only (items 5, 6, 9, 10, 13)

These were built in earlier passes this session. I will re-verify each against this request's exact wording rather than rebuilding, and note any small diffs found:

- **Item 5 (fixed-header scrolling)** — done in `ShoppingList.tsx` (`calc(100dvh - 3rem)` flex-column shell, single `flex-1 overflow-y-auto` list region). No further changes expected.
- **Item 6 (Quick Add category selector opens a lightweight dropdown, not the sheet)** — done (`QuickAddBar.tsx` + `CategoryDropdown.tsx`). No further changes expected.
- **Item 8 (swipe delete, reset on complete/restore/move)** — done (`ItemCard.tsx`'s `useEffect` reset on `is_done` change, plus the two-branch render split that removes the swipe layer entirely for completed rows). Once Workstream A ships, I'll double check swipe still resets correctly for clustered rows specifically.
- **Item 9 (completed items grouped, muted, no opacity-on-container, no red bleed-through)** — done (the two-branch `ItemCard` split was exactly this fix from an earlier bug report).
- **Item 10 (bottom sheet 72–75vh / 24px radius / 24px padding / sticky CTA)** — mostly done: `BottomSheet.tsx` already targets `HEIGHT_FRACTION = 0.75` and `rounded-t-[24px]`. **One small gap:** the requested sticky-button copy is `"הוסף לרשימה"`, but the current label (`src/i18n/shoppingList.js`) reads `"הוסף לרשימה המשותפת"` ("add to shared list") — I'll shorten it to match exactly.
- **Item 13 (performance at 100 items / 20 categories)** — no virtualization exists today; at 100 items this is very unlikely to be a real bottleneck for a flex/CSS-only list (no known heavy re-render patterns — `useMemo` already guards the grouping/filtering derivations). I'll do a quick manual pass (React DevTools profiler is unavailable in this sandbox, so this will be a code-level review, not a measured profile) to check for any obviously wasteful re-renders introduced by Workstream A's clustering, and confirm `key` props stay stable across the new grouping to avoid needless remounts.

**Backend changes:** None. **Migration strategy:** N/A.

---

## Workstream F — Keyboard Handling (item 11)

Already implemented (`BottomSheet.tsx`'s `visualViewport`-driven `top`/`height` overlay positioning, fixed in an earlier bug-report round this session). I'll re-verify this specifically still holds once the sticky-CTA copy change and any layout tweaks from Workstream D land nearby in the same file, since it's easy to accidentally regress this while touching the same component. No new implementation expected here — verification only.

---

## Summary: What Actually Needs a Migration

Only **one** schema change across all 14 items:

| Change | Table | Column | Why |
|---|---|---|---|
| Archive lists | `lists` | `archived boolean not null default false` | No existing column represents this; required to satisfy item 3's archive requirement. |

Everything else (grouping, default categories, rename, delete, member removal, layout/animation/touch-target polish) ships with zero schema changes, reusing existing RLS policies and hooks.

---

## Suggested Implementation Order

1. Workstream D (layout polish) — fully isolated, lowest risk, no interaction with other workstreams.
2. Workstream A (grouping) — needed before Workstream D's row-height/quantity changes can be finished for real.
3. Workstream B (default categories) — isolated, one file + one style entry.
4. Workstream C (Lists screen + archive migration) — largest single workstream, touches a new migration.
5. Workstream E/F verification pass — re-check everything together once A–D are in, since A/D touch files E/F already depend on (`ItemCard.tsx`, `BottomSheet.tsx`).

Each workstream will be verified with `tsc --noEmit` → `npm run build` → `npm run lint` plus manual code review before commit, same as every prior round this session. As before, there are no Supabase credentials in this sandbox, so no live rendering/device testing is possible — real-device confirmation on iOS Safari/Android Chrome remains necessary after merge, same standing caveat as every previous pass.

---

## Open Decision Points (please confirm before I start)

1. **Workstream A:** swipe-delete on a grouped row — delete one unit (decrement, my default) or the whole cluster?
2. **Workstream B:** should the signup-trigger's 8-category set be updated to match this request's 9-category set for consistency (touches a migration, no schema change), or left as-is (two slightly different default sets depending on list-creation path)?
3. **Workstream C:** confirm icon-change should be deferred (recommended) rather than adding an icon/emoji column now.

If you're fine with my recommended defaults on all three (grouped-row swipe deletes one unit; update the signup trigger for consistency; defer icon-change), just say "approved" and I'll start with Workstream D.
