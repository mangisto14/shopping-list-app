# Shopping List Screen — Design Context

Analysis only — no code was modified to produce this document. Reflects the codebase at branch `claude/app-design-branch-8hyo9t` (currently identical to `develop`), route `/`, `src/pages/ShoppingList.tsx`.

---

## 1. Component Hierarchy

```
App.jsx (AppShell)
├─ top chrome row (h-12, fixed height) — HeaderMenu, language select
├─ PageFade (opacity fade wrapper on route change)
│  └─ ShoppingList.tsx  (route "/")
│     ├─ Top Panel (flex-shrink-0, non-scrolling)
│     │  ├─ ListSwitcher
│     │  │  └─ ListSelectorModal (opens on tap)
│     │  │     └─ ListCard × N
│     │  ├─ ShoppingHeader
│     │  │  └─ MemberAvatarGroup
│     │  │     └─ MemberAvatar × N
│     │  ├─ QuickAddBar
│     │  │  ├─ CategoryDropdown (opens on tap)
│     │  │  └─ QuantityStepper
│     │  └─ Category filter chip row
│     │     └─ CategoryChip (variant="filter") × N
│     │
│     ├─ <main> — the one scrolling region
│     │  ├─ (empty state) DemoItemRow → EmptyState  — OR —
│     │  └─ (populated) per category, "to-buy" then "completed":
│     │     └─ CategorySection
│     │        └─ ItemCard × N (clustered by identical name)
│     │
│     ├─ AddItemSheet (bottom sheet, opens via FAB)
│     │  ├─ BottomSheet (shell)
│     │  ├─ QuantityStepper
│     │  └─ CategoryChip (variant="default") × N
│     ├─ FloatingAddButton (center nav action button)
│     ├─ InviteMemberModal (opens from ShoppingHeader's invite button)
│     ├─ CreateListModal (opens from ListSwitcher/ListSelectorModal)
│     └─ UndoSnackbar (conditional, after a swipe-delete)
│
└─ BottomNav (fixed, rendered once for all authenticated routes)
```

## 2. Shared Components

These are used by the Shopping List screen but are **not owned by it** — changes ripple to other screens:

| Component | Also used by |
|---|---|
| `EmptyState` (`components/ui/EmptyState.tsx`) | Lists, Dashboard, Statistics, FamilyMembers, Categories |
| `MemberAvatar` / `MemberAvatarGroup` | FamilyMembers and others — single source of truth (an older duplicate, `shopping/MemberAvatar.tsx`, was removed and 6 importers migrated here) |
| `CategoryChip` (`components/ui/CategoryChip.tsx`) | AddItemSheet's category picker (via `variant="default"`) and the Shopping List filter row (`variant="filter"`) — same component, two visual variants |
| `QuantityStepper` | QuickAddBar and AddItemSheet |
| `BottomSheet` (`components/ui/BottomSheet.tsx`) | Generic modal shell — used by AddItemSheet and InviteMemberModal |
| `CategoryDropdown` | Also usable anywhere a category needs picking without a full sheet |
| `BottomNav`, `FloatingAddButton` | Global chrome — rendered once in `App.jsx`, present (nav bar) on every authenticated route; the FAB itself is rendered by `ShoppingList.tsx` but visually docked into the nav bar's center notch |
| `getCategoryStyle` (`theme/categoryStyles.ts`) | Category icon/color lookup — consumed by ItemCard, CategorySection, CategoryChip, CategoryDropdown, QuickAddBar, AddItemSheet, and the Categories page itself |

**Design implication:** a visual change to any of the above must be checked against every other consumer, not just the Shopping List screen.

## 3. Screen-Specific Components

These exist only for this screen and can be changed without affecting anything else:

- `ShoppingHeader` — title + presence dot + stats line + invite button
- `QuickAddBar` — docked quick-add card
- `ItemCard` — the shopping row itself (swipe-to-delete, checkbox, rename, quantity)
- `CategorySection` — collapsible category group wrapper
- `DemoItemRow` — non-interactive onboarding row shown once on empty state (deliberately **not** sharing code with `ItemCard` — separate constants/markup by design, so the two can diverge)
- `UndoSnackbar` — post-delete undo toast
- `ListSwitcher` / `ListSelectorModal` / `ListCard` — quick list-switching UI (list *data* itself, via `useActiveList`, is shared app-wide, but this specific switcher UI is screen-local)
- `AddItemSheet` — full add-item bottom sheet (content only; the `BottomSheet` shell itself is shared)

## 4. Layout Structure

- **Single-scroll-region architecture.** The page container is `display:flex; flex-direction:column; height:calc(100dvh - 3rem); overflow:hidden` (the `3rem`/`h-12` accounts for `App.jsx`'s own top chrome row, so page height + chrome height = exact viewport height — no page-level scrollbar can ever appear).
- Inside that, exactly two children:
  1. **Top Panel** — `flex-shrink-0`, never scrolls. Contains ListSwitcher → ShoppingHeader → QuickAddBar → category chip row, stacked with small `mt-1` gaps. None of these are individually `position: sticky` — they simply never enter the scrollable area.
  2. **`<main>`** — `flex-1 overflow-y-auto`, the **only** scrolling region in the entire screen (and per its own code comment, in the entire app). Bottom-padded to clear the fixed `BottomNav`.
- Category chip row scrolls **horizontally** independently (`overflow-x-auto`) inside the non-scrolling Top Panel.
- `FloatingAddButton` and `UndoSnackbar` are `position: fixed`, overlaid outside this flow, anchored to `env(safe-area-inset-bottom)`.
- Item rows within `<main>` are grouped: all "to-buy" category groups first, then (if any) a "הושלמו · N" (Completed · N) divider, then completed category groups.

## 5. Existing Spacing

- Screen horizontal padding: `px-3 sm:px-4`, max width `max-w-md sm:max-w-lg md:max-w-2xl`, centered.
- Top Panel internal rhythm: `mt-1` between ListSwitcher/Header/QuickAdd, `mt-3` before the chip row.
- Item list: `gap-2.5` between category sections; within a section, `gap-1` between rows (via `CategorySection`'s inner wrapper).
- Item row: `px-3 py-2`, `min-h-[52px]` (rows sit in a 50–56px band), `gap-2.5` between internal elements (strip/checkbox/name/quantity).
- Category section header: `px-2.5 py-1.5`.
- QuickAddBar card: `p-2.5` outer, `gap-2` between its two rows.
- Bottom clearance for the scroll region: `calc(4rem + env(safe-area-inset-bottom) + 16px)` (clears the fixed BottomNav + safe area + a small buffer).
- FAB vertical position: `bottom: calc(env(safe-area-inset-bottom) + 18px)`, deliberately overlapping ~46px into the BottomNav's own 64px-tall row (only ~12px of the button pokes above the bar).

## 6. Typography

- **Font:** Heebo (weights 400–800), fallback `-apple-system, system-ui, sans-serif`. Loaded globally via Google Fonts in `index.html`, configured as the Tailwind `sans` default.
- **Direction:** `dir="rtl"` set globally on `<html>` — all text is right-to-left by default; layouts use RTL-aware flex ordering rather than manual mirroring.
- Scale in use on this screen (Tailwind arbitrary sizes, not a formal type scale):
  - Screen title (`ShoppingHeader` `<h1>`): `text-[28px] font-extrabold`
  - Section/category label, item name: `text-[15px] font-semibold` (or `font-bold` for the completed-section divider)
  - Header stats line, category dropdown items: `text-[13px]`–`text-[14px] font-medium/semibold`
  - Quantity badges, delete-button label, category count badge: `text-[10px]`–`text-[12px] font-bold/semibold`
  - Category chip label: `text-[13.5px] font-semibold`

No shared design-token file for font sizes exists yet — sizes are hardcoded per component as Tailwind arbitrary values (`text-[Npx]`).

## 7. Colors

- **No global brand-color token file** — colors are plain Tailwind palette classes (`blue-600`, `purple-600`, `gray-*`, etc.) used directly per component.
- **Category colors** (the one true per-domain palette, `theme/categoryStyles.ts` — shared across every category-aware component):

  | Category | Icon | Color |
  |---|---|---|
  | מוצרי חלב (Dairy) | 🥛 | Blue |
  | בשר ודגים (Meat/Fish) | 🥩 | Red |
  | ירקות (Vegetables) | 🥦 | Green |
  | פירות (Fruit) | 🍎 | Orange |
  | ניקיון (Cleaning) | 🧽 | Cyan |
  | קפואים (Frozen) | 🧊 | Purple |
  | משקאות (Drinks) | 🥤 | Pink |
  | מאפים (Bakery, + 2 legacy aliases) | 🍞/🥐 | Amber |
  | *(unrecognized/uncategorized)* | 🛒 | Gray |

  Each entry supplies a `bg`/`text` pair (tinted badge), a solid `fill` (active chip), and a solid `strip` (the 4px category-color bar on each item row).

- **Action/brand colors currently in use:**
  - Blue (`blue-600`/`blue-500`) — primary actions: quick-add submit button, "add item" CTA in AddItemSheet, invite button icon, focus rings on most controls.
  - Purple (gradient `purple-500`→`purple-700`) — the center FloatingAddButton and active BottomNav tab state. Purple is newer than the blue used elsewhere on this screen — **not yet unified** (see §13).
  - Red (`red-500`/`red-600`) — delete affordance (permanent 2px strip + swipe-reveal panel), strengthening to `red-600` past the delete threshold.
  - Green — completed-item checkbox fill, presence dot.
  - Gray scale — inactive/neutral text, borders, disabled-looking states.

## 8. Icons

- **Icon library:** `@heroicons/react` (24px outline set for inactive nav tabs, solid set for active) — used only in `BottomNav`.
- **Everywhere else on this screen, icons are emoji**, not an icon font/SVG library: 🥛🥩🥦🍎🧽🧊🥤🍞🛒 (categories), 🛒 (empty state), ➕ (add actions), 🗑 (undo snackbar).
- A small number of **hand-drawn inline SVGs** exist for specific controls: the chevron in ListSwitcher/CategorySection/CategoryDropdown, the invite "+" icon in ShoppingHeader, and the trash-can icon in ItemCard's/DemoItemRow's delete panel (custom path, not a library icon).
- No consistent icon sizing system — sizes are set ad hoc per use (`w-[22px]`, `width="16"`, `text-[15px]`, etc.).

## 9. Existing Interactions

- **Swipe-to-delete** on active (not-yet-completed) rows only: drag right reveals a red delete panel on the left; release past ~180px commits the delete (drag itself is the confirmation, no second tap needed); release past a smaller threshold snaps open to a "reveal" state showing a tap-to-delete button; release below that snaps closed.
- **Tap-to-toggle** checkbox marks an item complete/incomplete; a completed row is a structurally separate, non-swipeable render path (no drag handlers mounted at all).
- **Tap-to-rename**: tapping an item's name turns it into an inline text input (blur or Enter commits).
- **Quantity +/-** stepper appears only for a "clustered" row (2+ items with the identical name) — increments add a new copy, decrements delete the most recent copy. A single-quantity row shows a plain "1x" label instead.
- **Category filter chips**: single-select row, horizontally scrollable, filters the visible item list by category (or "all").
- **Category collapse/expand**: tapping a category section header toggles that group's visibility; state is persisted per-list to `localStorage`.
- **List switching**: tapping the pill above the header opens a modal list picker.
- **Quick Add vs. full Add sheet**: the docked QuickAddBar is a fast, always-visible entry point; the FAB opens a fuller `AddItemSheet` with suggestion chips and a larger category picker. Both write to the same underlying add-item flow.
- **Undo**: after a swipe-delete, the item is only *hidden*, not yet deleted — a snackbar with "בטל" (Undo) appears; the real delete only commits after the undo window elapses (default 5s) or a second delete pre-empts it.

## 10. Existing Animations

| Element | Behavior | Default duration |
|---|---|---|
| Category section expand/collapse | CSS grid-rows (`0fr`↔`1fr`) height animation | 200ms |
| Item swipe reveal/snap-back | `transform: translateX()` transition | 180ms |
| Item delete | slide fully right → fade → height-collapse, staged locally before the row is actually removed (no jump cut) | 220ms per phase |
| One-time "discovery hint" on the **first** rendered row only | nudge right ~18px, hold, return — teaches the swipe gesture without a tutorial overlay | 500ms delay + 220ms slide + 500ms hold + 220ms return (~1.44s total) |
| Empty-state demo row | same discovery-hint shape, played on a non-interactive placeholder row, then fades out before the real empty state fades in | ~400ms delay + reveal/hold/return + 300ms fade |
| FAB tap | scale-down on press (150ms) + a one-shot "ping" pulse ring after release | 500ms pulse |
| BottomSheet open/close | slide up + backdrop fade, keyboard-aware repositioning via `visualViewport` | 250ms |
| Route change | whole-page opacity fade | 150ms |
| Reduced-motion | All of the above degrade to instant/near-instant transitions when `prefers-reduced-motion: reduce` is set |

**Note:** most of these durations (and several behavioral toggles — swipe delete on/off, Undo snackbar on/off, demo mode on/off, haptics on/off) are live-tunable via an internal Developer Console (`useDevTools()`), not hardcoded — see §13.

## 11. Business Logic That Must Not Change

- **Data model:** `items` has no `quantity` column. "Quantity" is entirely a client-side illusion — identical-name items are clustered for display, and the stepper adds/removes literal duplicate rows. Do not design around an assumption that quantity is a stored field.
- **Swipe-delete is destructive at the cluster level**: swiping a grouped ("Nx") row deletes the *entire* group, never a single unit — decrementing is the only partial-removal path, and it removes one *underlying row*, not a persisted count.
- **Undo is a soft-delete window**, not a true undo of a committed database write — the row is filtered out of the render, not actually deleted, until the timer elapses.
- **Category filter and "the category being assigned to a new item" are intentionally separate states** — conflating them previously caused a real bug (adding an item silently changed the active filter, and filtering to "all" while adding could submit an invalid category value).
- **Toggling complete/incomplete** has a short (200ms) "stay in place" grace window before an item visually jumps to the other section, to let the checkbox's own fill/fade animation play — this is deliberate UX pacing tied to real state transitions, not decorative.
- **RTL swipe direction is intentional, not a bug**: dragging right (physical direction, independent of `dir`) reveals the delete action on the left.
- **Pointer-capture timing is load-bearing**: capture is deferred until real drag movement is confirmed. Capturing on every `pointerdown` unconditionally was a real, previously-shipped bug that made checkboxes/name buttons completely untappable (Chromium retargets the synthetic click to whichever element holds pointer capture).
- Archived lists are excluded from the quick switcher by design (only reachable from the Lists page).

## 12. Components Shared With Other Screens

(Consolidating §2 for a single reference list — changing any of these affects screens beyond Shopping List.)

- `EmptyState` — Lists, Dashboard, Statistics, FamilyMembers, Categories
- `MemberAvatar` / `MemberAvatarGroup` — FamilyMembers, others
- `CategoryChip` — AddItemSheet, Categories-related pickers
- `QuantityStepper` — AddItemSheet
- `BottomSheet` — AddItemSheet, InviteMemberModal, and any future modal
- `BottomNav`, `FloatingAddButton` — global, present on every authenticated screen
- `getCategoryStyle` / category color-icon system — Categories page, Dashboard, Statistics, plus every category-aware component listed above

## 13. Constraints the Designer Must Respect

1. **RTL-first.** All layout must work correctly under `dir="rtl"` as the default (not a mirrored afterthought) — the app is Hebrew-primary, with an English toggle.
2. **One-scroll-region rule.** Any new Top Panel content must stay non-scrolling (`flex-shrink-0`); only `<main>` may scroll. Do not introduce a second scrollable region or nested page scroll.
3. **Safe-area awareness.** Bottom-anchored elements (BottomNav, FAB, UndoSnackbar, AddItemSheet footer) must account for `env(safe-area-inset-bottom)` — do not hardcode a fixed bottom offset that ignores it.
4. **No schema changes implied by design.** Any new "field" shown in a mockup (e.g. quantity, price) needs an explicit product decision — this codebase's convention is to avoid schema changes where a client-side approximation suffices, but that's a decision to make explicitly, not assume.
5. **Shared-component ripple effects.** A visual change to `EmptyState`, `MemberAvatar`, `CategoryChip`, `QuantityStepper`, `BottomSheet`, `BottomNav`, or `getCategoryStyle` affects other screens — coordinate before changing, or introduce an opt-in variant (the established pattern in this codebase, e.g. `CategoryChip`'s `variant` prop) rather than changing shared default behavior.
6. **Two color systems currently coexist and are not yet unified**: blue (older, still primary on most controls on this screen) and purple (newer, used for the FAB and BottomNav active state). A designer should decide — and document — whether the intent is to consolidate on one brand color or deliberately keep purple as an "accent/primary action" color distinct from blue.
7. **Demo row and real ItemCard are deliberately decoupled** — `DemoItemRow` does not import or share constants with `ItemCard`. If ItemCard's row visuals change (e.g., its recent trash-icon repositioning to the left edge), `DemoItemRow` will **not** automatically follow and must be updated separately if visual parity between the two is desired.
8. **Animation timing and several behavior toggles are runtime-configurable** via an internal Developer Console (swipe reveal threshold/duration, delete animation duration, snackbar/undo duration, bottom-sheet duration, category-collapse duration, FAB pulse duration, swipe-delete on/off, Undo on/off, demo-mode on/off, haptics on/off). Default values are documented in §10, but the shipped defaults — not arbitrary values discoverable only via the dev console — are what a design review should be judged against.
9. **No formal design-token system yet** (no shared type-scale, spacing-scale, or color-token file) — sizes/colors are hardcoded per component as Tailwind arbitrary values. A designer introducing a token system should expect to touch many individual files, not one central theme file (the one exception is `theme/categoryStyles.ts`, which *is* centralized for category colors specifically).
10. **Row height band is load-bearing for touch ergonomics**: item rows target 50–56px with expanded invisible hit-slop on small controls (checkbox) — any redesign should preserve or improve, not shrink, effective tap-target size.
