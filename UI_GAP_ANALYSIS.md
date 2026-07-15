# UI Gap Analysis — Full Polish Pass (Screens 2a/2b/2c)

This supersedes the screen-scoped `UI_GAP_ANALYSIS.md` from the prior pass (2a-only) — that content is folded in here alongside the new requirements from this round. `docs/shopping-list-gap-analysis.md` and `docs/design-mapping.md` remain as historical record of the first two rounds.

No new reference screenshots were attached with this request; findings are grounded in (a) the round-2 device-frame mockups already analyzed in prior turns, and (b) the explicit numeric/behavioral spec given directly in this task (72–75vh sheet height, 24px radius/padding, 250/180/120ms animation timing, etc.) — those are implemented as stated rather than re-derived from pixels.

---

## 1. Header Section

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Residual vertical footprint | Fixed in the prior pass (double padding + stray margin removed, `ListSwitcher` compacted) — one more tightening pass possible: `mt-2` gap between `ListSwitcher`/`ShoppingHeader` | Slightly tighter (`mt-1.5`) | **Minor** | `src/pages/ShoppingList.tsx` |
| Metadata line alignment | Text-then-dot order (fixed round 2) | Matches | **Not a gap** | — |
| Avatar sizing | `MemberAvatarGroup` uses `size="sm"` (32px) consistently | Matches design's small header avatar stack | **Not a gap** | — |
| List-selector height | Compacted to a text-height pill in the prior pass | Matches | **Not a gap** | — |

## 2. Quick Add Card

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Proportions | `+`/input both 44px, card `rounded-[18px]`, inner controls `rounded-[14px]` | Already matches design tokens (verified round 1/2) | **Not a gap** | — |
| Internal spacing | `p-3` outer, `gap-2.5` row gaps | Consistent | **Not a gap** | — |

No further changes needed here beyond what's already shipped.

## 3. Category Filter Chips

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Chip density / spacing | `gap-2` (8px) between chips in the filter row | Slightly more breathing room per this pass's explicit ask ("too dense") | **Major** | `src/pages/ShoppingList.tsx` |
| Active chip dominance | Active shadow `0 4px 10px rgba(37,99,235,.3)` | Soften slightly so it doesn't overpower neighboring chips | **Minor** | `src/components/ui/CategoryChip.tsx` |
| Touch target vs. visual height | Chip height is a fixed 34px (matches the design's explicit token), below the 44px touch guideline the design's own notes mention | Accept the design's 34px as the visual spec (source of truth) — not growing chips past what the reference shows | **Minor** (documented trade-off, not fixed) | — |

## 4. Shopping Item Cards

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Card vertical padding | `py-3` (12px) | Tighter, `py-2.5` (10px), for higher on-screen density | **Major** | `src/components/shopping/ItemCard.tsx` |
| Gap between cards | `space-y-2` (8px) | `space-y-1.5` (6px) | **Major** | `src/pages/ShoppingList.tsx` |
| Typography/badge/checkbox/chevron positioning | Already matches (verified rounds 1–2) | Matches | **Not a gap** | — |

## 5. Completed Items Section

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Visual separation from the to-buy list | Just a spacing gap (`pt-2`), no visual divider | A subtle top border/divider before the "הושלמו" toggle | **Minor** | `src/pages/ShoppingList.tsx` |
| Collapsed-state affordance | Chevron rotates 180° on collapse — already present | Matches | **Not a gap** | — |

## 6. Floating Action Button

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Position | Centered, clears bottom nav via `calc(4rem + safe-area + 1rem)` | Confirmed correct against round-2 reference; no change | **Not a gap** | — |
| Animation duration | Uses default Tailwind transition timing (150ms) | 180ms per this pass's explicit spec | **Minor** | `src/components/shopping/FloatingAddButton.tsx` |

## 7. Bottom Navigation

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Icon size | `size-6` (24px) | Design token is 22px | **Minor** | `src/components/navigation/BottomNav.tsx` |
| Label size | `text-xs` (12px) | Design token is 11px | **Minor** | `src/components/navigation/BottomNav.tsx` |
| Glass effect, active state, height | Already correct (prior passes) | Matches | **Not a gap** | — |

## 8. Add Item Bottom Sheet

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Height | `max-h-[85vh]`, content-driven | 72–75vh, explicitly capped | **Critical** | `src/components/ui/BottomSheet.tsx` |
| Border radius | `rounded-t-3xl` = 24px (top, mobile) already correct; `sm:rounded-2xl` = 16px (centered variant) is not | 24px everywhere | **Major** | `src/components/ui/BottomSheet.tsx` |
| Internal padding | `p-5` = 20px | 24px (`p-6`) | **Major** | `src/components/ui/BottomSheet.tsx` |
| "Cramped" feel / spacing between sections | `space-y-4` (16px) applies uniformly, but header/body/footer aren't structurally separated, so the CTA and category grid crowd the scroll area | Restructure into header / scrollable body / footer regions with breathing room between them | **Critical** | `src/components/ui/BottomSheet.tsx`, `src/components/shopping/AddItemSheet.tsx` |
| Categories too close together | `gap-2` (8px) in the category grid | `gap-2.5` (10px) | **Major** | `src/components/shopping/AddItemSheet.tsx` |
| CTA too close to edges | Inherits the sheet's 20px padding | Inherits the new 24px padding once §8's padding fix lands | **Major** (resolved by the padding fix) | `src/components/ui/BottomSheet.tsx` |

## 9. Keyboard-Safe Behavior (Critical)

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Sheet sizing on keyboard open | Sheet height is driven by `vh` units / `max-h-[85vh]`, which mobile browsers don't reliably shrink when the on-screen keyboard opens — content (input, categories, CTA) can end up hidden behind the keyboard | Track `window.visualViewport` height live and cap the sheet's height to a fraction of the **actual visible** viewport, not the layout viewport, so the sheet always fits above the keyboard | **Critical** | `src/components/ui/BottomSheet.tsx` |

Implementation approach: `visualViewport.resize`/`scroll` listeners update a height value in state, applied as an inline `maxHeight` style; falls back to the static `75vh` when `visualViewport` isn't available (older browsers) — progressive enhancement, no behavior regression where the API is missing.

## 10. Sticky CTA Area

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| CTA position | Renders as the last item inside the same scrollable region as the rest of the form | Pinned outside the scrollable area (structural footer, not CSS `sticky` inside a variable-height flex context — more reliable across browsers), full width, safe-area bottom padding | **Critical** | `src/components/ui/BottomSheet.tsx` (new `footer` slot), `src/components/shopping/AddItemSheet.tsx` |

## 11. Category Selection Area

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Row cap before scrolling | `max-h-28` (112px) ≈ 3 rows | ~2 rows (`max-h-20`, 80px) before internal scroll | **Minor** | `src/components/shopping/AddItemSheet.tsx` |
| Selected-state styling | Preserved (uses the same `CategoryChip` active state) | Matches | **Not a gap** | — |

## 12. Invite Members Dialog

| Issue | Current | Expected | Severity | Files |
|---|---|---|---|---|
| Dimensions/padding/radius | Inherits whatever `BottomSheet` provides | Once §8's structural fix lands (24px radius/padding), this dialog inherits it automatically — no dialog-specific code changes needed | **Not a gap** (resolved via shared component) | — |
| Typography, inputs, buttons, divider | Already matched in the prior pass (title copy, link icon, unified label weight) | Matches | **Not a gap** | — |

## 13. RTL Polish

Audited every file touched in this pass plus the shared `BottomSheet`. No new directional bugs found — DOM ordering (title/close, stepper/chip, checkbox/content/actions) was already verified correct for `dir="rtl"` in the prior two rounds, and the structural `BottomSheet` refactor in this pass doesn't reorder any of that, only adds layout wrapper divs.

## 14. Mobile UX Polish

Covered by §§3–11 (density, spacing, sticky CTA, keyboard safety). No separate changes beyond those.

## 15. Animations

| Element | Current | Expected | Files |
|---|---|---|---|
| Bottom sheet open/close | `duration-200` (200ms) | `duration-[250ms]` | `src/components/ui/BottomSheet.tsx` |
| FAB | default (150ms) | `duration-[180ms]` | `src/components/shopping/FloatingAddButton.tsx` |
| Chip selection | default (150ms) | `duration-[120ms]` | `src/components/ui/CategoryChip.tsx` |

---

## Summary

**Critical**: sheet height cap (72–75vh), header/body/footer structural split, keyboard-safe `visualViewport` sizing, sticky CTA footer.
**Major**: sheet radius/padding to 24px, category-grid gap, category-filter-row gap, item-card density (padding + inter-card gap).
**Minor**: completed-section divider, animation-duration explicit values, bottom-nav icon/label size, active-chip shadow softening, category-grid row cap.

All changes are Tailwind classes, inline styles, and one `visualViewport` event-listener effect — no Supabase, hook, query, auth, realtime, routing, or data-model code is touched anywhere in this pass.
