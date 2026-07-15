# UI Gap Analysis — Pixel-Parity Pass 4 (Swipe Gestures, Micro-interactions)

Supersedes the prior `UI_GAP_ANALYSIS.md` (15-section pass). No new reference screenshots were attached with this request; findings combine (a) the round-2 device-frame mockups analyzed in earlier turns, (b) the explicit numeric/behavioral spec given directly in this task, and (c) direct source review of every file this pass touches or audits.

Sections 1–3, 9–15 were implemented in the prior two passes and are **re-verified intact** below rather than re-implemented. Sections 5, 6, 16, 17, 18 are **new** in this round.

---

## 1–3. Header, Quick Add Card, Category Filter Chips

Re-verified against current source: double-padding removed, `ListSwitcher` compacted, chip sizing (34px/14px/13.5px-600) and gap (10px) in place, active-chip shadow softened. **No regressions, no further changes** — except:

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Chip row scroll feel | Plain `overflow-x-auto`, no momentum-scroll hint on iOS | `-webkit-overflow-scrolling: touch` + `scroll-smooth` for a native-feeling swipe-scroll | **Minor** | `src/pages/ShoppingList.tsx`, `src/components/shopping/AddItemSheet.tsx` |

## 4. Shopping Item Cards

Density already tightened in pass 3 (`py-2.5`, `gap-1.5` between cards). Typography/badge/checkbox positions verified correct. Target "6–8 visible items per screen" is a direct consequence of the density work already done — no further padding changes; the structural change this pass makes (removing the trash button, §5) also removes a flex child, buying back a little more horizontal room for the name/badge.

## 5. Remove Delete Button (Critical — new)

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Static trash icon | Always-visible 🗑️ button, third flex child in every item row | Removed entirely — delete only reachable via the swipe gesture (§6) | **Critical** | `src/components/shopping/ItemCard.tsx` |

## 6. Swipe Gestures (Critical — new)

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| No swipe interaction | Item rows are static; the left chevron added in pass 2 is decorative only | Real swipe-left gesture: partial swipe reveals a red delete action (tap to confirm); swipe past a larger threshold deletes immediately (the drag itself is the confirmation); release below the reveal threshold snaps back closed | **Critical** | `src/components/shopping/ItemCard.tsx` |

**Implementation**: Pointer Events (`onPointerDown/Move/Up`), not a gesture library — keeps the dependency footprint unchanged. Direction: dragging the finger **left-to-right** (positive screen-space delta) reveals the action on the card's **left** edge, matching the design's mid-swipe row and the "swipe against reading direction reveals trailing actions" convention (RTL reads right-to-left, so the natural reveal gesture mirrors LTR's familiar "swipe left" - it isn't a literal copy of the LTR direction, which would put the reveal on the wrong edge for RTL). A vertical-dominant drag is detected and treated as a page scroll, not a swipe. Exit animation (opacity fade) plays for ~180ms before `onDelete()` fires. `onDelete`/`onToggle`/`onRename` prop contracts are unchanged.

**Accessibility trade-off, flagged not hidden**: removing the always-visible delete button (per this task's explicit §5 instruction) means delete has no keyboard/screen-reader path anymore - swipe gestures aren't operable without a pointer. This is a deliberate scope decision from the task, not an oversight; noting it here so it's a visible, documented trade-off rather than a silent regression.

## 7. Completed Items Section

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Divider before section | Added in pass 3 | Matches | **Not a gap** | — |
| Swipe delete on completed rows | `ItemCard` is shared between to-buy and completed lists already | Automatically inherited once §6 lands — no separate code path | **Not a gap** (resolved via shared component) | — |
| "Restore" action | Checkbox tap already flips `is_done` back to `false` via the existing `onToggle`/`toggleItem` | This already *is* the restore action — no new code needed | **Not a gap** | — |

## 8. (renumbered from prior pass — merged into §6/§7 above)

## 9–12. FAB, Bottom Nav, Add Item Sheet (height/radius/padding), Keyboard-Safe Behavior

Re-verified: FAB centered, 180ms transition, safe-area-aware offset math unchanged (no overlap with bottom nav). Bottom nav 22px icons / 11px labels, glass effect intact. `BottomSheet.tsx`'s header/body/footer split, 75vh `visualViewport`-based cap, 24px radius/padding, 250ms transition all confirmed present from pass 3 — **no changes needed**.

## 13. Sticky CTA Area

Already resolved via `BottomSheet`'s `footer` slot (pass 3) — `AddItemSheet`'s submit button renders there, structurally pinned outside the scrollable body. **No changes needed.**

## 14. Category Selection Area

`max-h-20` (≈2 rows) + `gap-2.5` already in place (pass 3). **No changes needed.**

## 15. Invite Members Dialog

Title copy, link icon, unified label weight already done (pass 2); inherits pass 3's shared-sheet radius/padding automatically. **No changes needed.**

## 16. RTL Polish

Re-audited every file touched or read this pass. No new directional bugs. The one new interactive surface (swipe gesture, §6) is direction-agnostic at the pointer-math level and was explicitly checked against the design's left-side reveal (see §6's implementation note) — this is the one place RTL correctness actually mattered for new code this round.

## 17. Empty State (Major — new)

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| No helper text or CTA | `<EmptyState icon="🛒" title={t.empty} size="lg" />` — icon + title only | Add a description line and an action button that opens the add-item sheet | **Major** | `src/pages/ShoppingList.tsx` |

## 18. Long List Performance (50–100 items)

No virtualization library added — at 50–100 simple flex-row items, React's default reconciliation with stable `key={item.id}` renders and scrolls natively fine on mobile; introducing `react-window`/similar would be a real architectural change (and a new dependency) disproportionate to the actual item counts a household shopping list reaches. Verified conceptually (stable keys, no per-item inline function identity churn beyond what already existed, no layout-thrashing CSS like animated `height: auto`). **Not device-tested** — no Supabase credentials in this sandbox to seed 100 real rows and load-test on an actual phone; flagging this as a manual QA step rather than claiming verified performance.

## 19. Checkbox Interaction (Major — new)

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Instant list-jump on toggle | Toggling `is_done` immediately reclassifies the item into the other section on the very next render — no visible transition | A ~200ms window (within the 150–250ms spec) where the item shows its new checked/faded state in place, *then* moves to the other section, avoiding an abrupt re-render | **Major** | `src/pages/ShoppingList.tsx` |

**Implementation**: local `pendingMoves` state (a `Set` of item ids currently mid-transition) plus a `pendingSection` map capturing which section an item should *stay* rendered in for ~200ms after a toggle, even though the underlying `is_done` (and thus real hook state) has already flipped. `toggleItem()` is still called immediately — this only delays which list section the item visually renders in, not when the mutation happens.

## 20. Mobile UX Polish / Animations

Explicit durations from this and prior passes: sheet 250ms, FAB 180ms, chip 120ms (all pass 3), checkbox 200ms (§19, this pass), swipe exit ~180ms (§6, this pass). All use Tailwind's default `ease` (`cubic-bezier(0.4,0,0.2,1)`) — smooth, no linear/jank.

---

## Summary

**Critical (new this pass)**: remove static delete button, implement real swipe-to-delete.
**Major (new this pass)**: checkbox-completion transition, richer empty state.
**Minor (new this pass)**: momentum scroll on chip rows.
**Re-verified, no regressions**: everything from passes 2–3 (header, quick-add, chips, item density, FAB, bottom nav, sheet height/radius/padding, keyboard safety, sticky CTA, category grid, invite dialog, RTL).

No Supabase, hook, query, auth, realtime, routing, or data-model code touched — the swipe gesture and checkbox animation are both purely local component state layered on top of the existing, unmodified `onDelete`/`onToggle`/`toggleItem`/`deleteItem` calls.
