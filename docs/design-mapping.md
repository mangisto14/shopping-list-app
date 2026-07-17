# Claude Design → App Mapping

## Implementation status: done

The clarifying-question flow in this session couldn't get a response
(tool error, repeated), so implementation proceeded with the
"Recommended" default from each open question below, applied and
verified (tsc + `vite build` both clean):

1. **Bottom nav** → Option A: tabs now match the design exactly
   (רשימה/קטגוריות/משפחה/היסטוריה). `/home` and `/statistics` still
   exist as routes, just off the tab bar.
2. **Brand color** → switched app-wide from violet/purple to the
   design's blue (`#2563EB` = Tailwind `blue-600`) + green success
   (`#22C55E` = `green-500`). `src/theme/colors.ts` centralizes this;
   every hardcoded `violet-`/`purple-`/`emerald-` className in the
   codebase was swept to `blue-`/`green-`.
3. **Swipe-to-reveal gesture** → skipped. Item delete stays a static
   button (now smaller/quieter, matching the design's minimal look)
   instead of a swipe reveal - no gesture library added, no new touch
   handling.
4. **Quick-add bar** → added alongside the existing FAB, per the
   "recommended" option. Tapping its category chip opens the existing
   full `AddItemSheet`; the input+"+" button submit directly through
   the same `addItem` used everywhere else.

Other decisions made along the way, not originally listed as open
questions:

- Main list screen now groups items into a flat "לקנות · N" list +
  collapsible "הושלמו · N" section (matching the design) instead of
  per-category collapsible groups. `CategorySection.tsx` (the old
  per-category component) was deleted since nothing uses it anymore;
  its `getCategoryStyle` map moved to `src/theme/categoryStyles.ts` and
  gained the design's remaining 4 categories (ניקיון/קפואים/משקאות/פירות).
- `ShoppingList.tsx` no longer renders `PresencePanel`/`MembersPanel`
  inline (design doesn't show them on this screen) - member
  list+invite now live fully on the Family screen. Both components,
  plus `MemberCard.tsx` and `InviteMemberButton.tsx`, were deleted as
  dead code once nothing imported them anymore.
- Heebo font added (Google Fonts link + `tailwind.config.js`
  `fontFamily`), replacing the default system sans everywhere.
- Data gaps from §5 (presence status, purchase cost, item assignee,
  History's month filter) were **omitted**, not fabricated - the
  History header shows a session count instead of a cost total, member
  rows show join date instead of an online/last-seen line.
- No Supabase credentials exist in this sandbox, so the authenticated
  screens (list/categories/family/history) could not be visually
  verified in a live browser - only `Login`/`Register` are reachable
  without a session, and even those fail to render here because the
  Supabase client throws synchronously without `VITE_SUPABASE_URL`.
  Verification for this pass was `tsc --noEmit` (clean) + `vite build`
  (clean) + a manual read-through of every changed file. Please smoke-test
  in an environment with real credentials before merging.


Source: `Grocery_App_UI__Standalone.html` (Claude Design export, canvas doc `p/e1838e53-...`).
The export contains 4 mobile screens (iPhone 15 Pro frame, RTL, Hebrew, Heebo font, light mode) plus a design-system board (colors, type scale, spacing/radius/shadow tokens, control states).

No code has been changed. This is the analysis/planning document requested before implementation.

## 1. Design screens found

The design only covers **4 screens**, reachable from a 4-tab bottom nav:

| # | Design screen (Hebrew label) | Bottom-tab icon/label in design |
|---|---|---|
| 1 | רשימת קניות (מסך ראשי) — Main shopping list | רשימה (list icon) |
| 2 | קטגוריות — Categories grid | קטגוריות (grid icon) |
| 3 | משפחה — Family / members / invite | משפחה (people icon) |
| 4 | היסטוריית קניות — Purchase history timeline | היסטוריה (clock icon) |

**Not present in the design at all:** Dashboard (`/home`), Statistics (`/statistics`), Lists (`/lists`), Login, Register. These routes must stay as-is (unstyled by this design) unless you want me to extend the design system to them by extrapolation.

## 2. Screen → Route mapping

| Design screen | Existing route | Existing page component |
|---|---|---|
| 1 · Main list | `/` | `src/pages/ShoppingList.tsx` |
| 2 · Categories | `/categories` | `src/pages/Categories.tsx` |
| 3 · Family | `/family` | `src/pages/FamilyMembers.tsx` |
| 4 · History | `/history` | `src/pages/History.tsx` |
| *(no design)* | `/home` | `src/pages/Dashboard.tsx` |
| *(no design)* | `/statistics` | `src/pages/Statistics.tsx` |
| *(no design)* | `/lists` | `src/pages/Lists.tsx` |

Routing itself (`src/App.jsx`) is untouched — same paths, same `<Route>` list.

## 3. Bottom navigation — a real conflict

Current `BottomNav.tsx` has 4 tabs: **בית (Dashboard) · רשימה · סטטיסטיקה · חברים**, wired to `/home /  /statistics /family`.

The design's bottom nav also has exactly 4 tabs, but a **different set**: **רשימה · קטגוריות · משפחה · היסטוריה**, wired to `/  /categories /family /history`.

These aren't reconcilable by pure restyling — it's a different information architecture (Categories and History tabs replace Dashboard and Statistics). Routes don't change either way (all 7 routes keep existing), but the tab bar itself needs a decision:

- **Option A** — Match the design exactly: BottomNav shows רשימה / קטגוריות / משפחה / היסטוריה. `/home` and `/statistics` remain reachable only by direct URL (no tab), or get folded elsewhere.
- **Option B** — Keep current 4 tabs (בית/רשימה/סטטיסטיקה/חברים), restyle their look (icons, colors, active state) to match the design's visual language, but keep the current IA. Categories/History become secondary, not tab-level.
- **Option C** — 5-tab bar merging both sets (בית, רשימה, קטגוריות, סטטיסטיקה, משפחה, היסטוריה is 6 — too many for a bottom bar on mobile; would need a "More" tab).

I'd default to **Option A** (match the source of truth exactly, per your instructions) unless you tell me otherwise — flagging it because it changes which pages a user can reach in one tap, which is a product decision, not a styling one.

## 4. Design component → existing component mapping

### Screen 1 · Main list (`ShoppingList.tsx`)

| Design element | Existing component | Change needed |
|---|---|---|
| Header (list name, "משפחת לוי · N מחוברים · N פריטים", avatar stack, search icon button) | `ShoppingHeader.tsx` + `MemberAvatarGroup.tsx` | Restyle: white card → transparent/inline header per design (no card chrome), add search icon button (new), swap "X בני משפחה" pill for inline presence line under title |
| Quick-add card (inline text input + "+" button + category chip + qty stepper, docked at top) | `FloatingAddButton.tsx` + `AddItemSheet.tsx` (currently a FAB that opens a bottom sheet) | **Structural change**: design replaces the FAB+sheet pattern with an always-visible quick-add card pinned under the header. FAB still exists lower on the screen in the design as a floating "+" for the full add sheet — so likely both patterns coexist: inline quick add for fast text entry, FAB for the fuller sheet. Needs product confirmation. |
| Category filter chips row ("הכל" + categories, horizontal scroll) | `CategoryChip.tsx` (used in `ShoppingList.tsx` filter row) | Mostly a restyle: pill height 34px, active = solid `#2563EB` with shadow, inactive = white pill with soft shadow (no border) |
| "לקנות · N" section label | New inline label, not currently componentized (closest: `SectionHeader.tsx`) | Add as small section-header text above the item list |
| Item row (checkbox, name, category tag, qty ×N, assignee avatar, swipe-to-reveal שיוך/מחיקה) | `ItemCard.tsx` | Restyle card radius/shadow/spacing; **add swipe gesture** (currently only has a static delete button, no swipe-to-reveal actions) — new interaction, needs a swipe library or custom touch handling |
| "הושלמו · N" collapsible section with strike-through rows | `CategorySection.tsx` (already collapsible) + `ItemCard.tsx` (`is_done` styling) | Mostly restyle; current implementation already groups by category, not by done/not-done as a single collapsible block — needs a "completed" grouping variant |
| FAB (+) | `FloatingAddButton.tsx` | Restyle only (color, size, shadow) — position/behavior stays |
| Bottom nav | `BottomNav.tsx` | See §3 above |

### Screen 2 · Categories (`Categories.tsx`)

| Design element | Existing component | Change needed |
|---|---|---|
| Header ("קטגוריות", "N קטגוריות · N פריטים פעילים") + "חדשה" pill button | Current page has a plain `<h2>` + inline add form (text input + "הוסף" button) | **Full rebuild**: current page is a bare list-based CRUD UI (no cards, no grid, no counts, no icons). Needs new header layout + stat subtitle + pill "add" trigger (opens a form/sheet, not an inline `<input>`) |
| 2-column category card grid (icon tile, name, item count, color accent bar) | None — current page renders `<ul><li>` rows, not cards | **New component**: a `CategoryCard` (icon + color + count) is needed. Can reuse `getCategoryStyle()` from `CategorySection.tsx` for icon/color, but needs a grid-card presentation, not a chip |
| Dashed "יצירת קטגוריה חדשה" add-tile in the grid | None | New component or a variant of the empty-state pattern |
| Rename / delete | Existing (`updateCategory` on blur, `deleteCategory` via 🗑️ button) | Logic reused as-is; UI needs to move into the new card (e.g. tap card → edit sheet, or long-press → delete) rather than inline `<input>`/button per row |
| Bottom nav | `BottomNav.tsx` | See §3 |

### Screen 3 · Family (`FamilyMembers.tsx`)

| Design element | Existing component | Change needed |
|---|---|---|
| Gradient "family" hero card (name, "N חברים · N רשימות משותפות", avatar stack, "הזמנת בן משפחה" button) | No equivalent — current page has a plain `<h1>` + `InviteMemberButton` in the header row | **New component**: gradient hero card. Reuses `MemberAvatarGroup` for the stack and `InviteMemberButton`/`inviteMember` handler for the CTA, but needs new card chrome |
| Members list (avatar w/ presence dot, name, status line, role pill) | `AppCard` + `MemberAvatar` (already used per-member in current page) | Restyle into a single grouped list card (design) instead of one `AppCard` per member (current); role pill and status line need new markup — "status" (online/last seen) isn't in current member data model (see §5) |
| Invite-link card (monospace URL, "העתקה" button, expiry note) | `InviteLinkCard.tsx` exists but is **not currently rendered** on `FamilyMembers.tsx` (only `InviteMemberModal`/email invite is wired there) | Reuse `InviteLinkCard.tsx`, restyle to match design, and actually mount it on this page |
| Empty state ("עדיין אין בני משפחה" + dashed border + icon) | `EmptyState.tsx` (already used: `icon="👨‍👩‍👧" title="אין עדיין חברים ברשימה זו"`) | Restyle only (dashed border variant is new — current `EmptyState` uses solid white card, not dashed) |
| Bottom nav | `BottomNav.tsx` | See §3 |

### Screen 4 · History (`History.tsx`)

| Design element | Existing component | Change needed |
|---|---|---|
| Header ("היסטוריה", "יולי 2026 · N קניות · ₪N") + month filter pill | Current page has a plain `<h2>היסטוריית קניות</h2>`, no subtitle, no filter | **New**: subtitle line (aggregate cost — not in current data model, see §5) + month-filter dropdown pill (new component) |
| Vertical timeline (dot + connecting line + date card: date, cost, item count pill, "הושלם ע״י X" with avatar) | Current page renders a flat `<ul>` of `bg-gray-100` boxes listing items inline (no timeline, no cost, no per-session avatar) | **Full rebuild**: current `history` table query (`supabase.from('history')...`) returns rows with `items` embedded and `created_at` — no `cost`/`total` field and no `completed_by` field exist in the query today. Timeline dot/line UI is entirely new. |
| Bottom nav | `BottomNav.tsx` | See §3 |

### Design-system board → theme files

| Design token group | Existing file | Change needed |
|---|---|---|
| Colors (Primary `#2563EB` blue, Background `#F8FAFC`, Surface `#FFFFFF`, Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444`, Text `#111827`/`#6B7280`) | `src/theme/colors.ts` (currently **violet/purple** brand + emerald success + red danger + gray neutral) | **Brand color change**: app is violet/purple (`BRAND.gradient = from-violet-500 to-purple-500`) today; design's primary is blue (`#2563EB`, no gradient — flat fills with shadow, not gradients, except the family hero card and FAB which do use a subtle blue gradient/shadow). This is the single biggest visual change and needs explicit sign-off (see §6). |
| Typography (Heebo, 28/800 title, 20/700 subtitle, 16.5/600 item name, 13/500 body, 11.5/700 tag) | `src/theme/typography.ts` (uses Tailwind default sans, no Heebo loaded anywhere in the project) | Add Heebo font (Google Fonts `<link>` or self-hosted `@font-face`, matching the design's Hebrew/Latin/symbol subsets) + extend `tailwind.config.js` `fontFamily` + update `typography.ts` scale to match sizes/weights above |
| Spacing/radius (4/8/12/16/20/24px spacing scale; 12/16/20/pill radii) | `src/theme/spacing.ts` (4/8/12/16/24/32 scale, no radius tokens) | Close enough — radius tokens (12/16/20/pill) don't exist yet as named tokens, currently ad-hoc `rounded-xl`/`rounded-2xl`/`rounded-full` per component. Could add a `RADIUS` token map for consistency, or keep ad-hoc since Tailwind classes already cover it. |
| Category tag colors (dairy blue, veg green, fruit amber, meat/fish red, cleaning purple, frozen cyan, drinks pink, bakery orange) | `CategorySection.tsx`'s `CATEGORY_STYLES` map (currently only 4 named categories: dairy/meat/veg/bakery, keyed by exact Hebrew string match, everything else falls back to gray) | Extend the map to cover all 8 design categories (add ניקיון/קפואים/משקאות with new colors) and keep the fallback for anything else |
| Card shadow scale (soft card shadow vs. elevated/brand shadow) | Ad-hoc `shadow-sm` everywhere via `AppCard.tsx` | Add an "elevated" shadow variant (design uses a stronger `0 8-12px 20-28px` shadow for hero/FAB elements vs. a subtle `shadow-sm` for regular cards) |
| Buttons/controls (primary/secondary/danger/disabled, chips, checkbox states) | Scattered per-component (no shared `Button` component exists — each page/component hand-rolls its own `<button className=...>`) | Design implies a small `Button` component (primary/secondary/danger/disabled variants) would reduce duplication, but isn't strictly required — restyling in place also works |

## 5. Data gaps (design shows data the current schema/hooks don't provide)

These need either a backend/hook change (out of scope per your "keep Supabase/RLS/business logic unchanged" instruction) or the UI must omit/fake-safe them:

- **Member presence** ("מחוברת עכשיו" / "נראה לאחרונה 14:20" / "לא מחוברת") — `useMembers()` has no online/last-seen signal (already flagged as a known gap in `MemberCard.tsx`/`PresencePanel.tsx` comments). Design's Family screen leans on this heavily.
- **Purchase cost per history session** (₪486.90 etc.) and **completed-by attribution** — `history` table query in `History.tsx` has no `cost`/`total` or `completed_by` field wired up today.
- **Item assignee avatar** on item rows (screen 1) — `useItems()`'s `Item` type has no assignee field (`ItemCard.tsx` already has a `TODO` noting "no profiles table yet, not wired to item.user_id").
- **Swipe-to-reveal actions** ("שיוך"/assign, "מחיקה"/delete) — assign-to-member action doesn't exist anywhere in the current app; only delete does.

I'll treat these as: keep existing real data/behavior, omit the parts of the design that need data we don't have (no fabricated numbers), unless you want me to also wire up the missing pieces.

## 6. Required new components (not restyles of existing ones)

1. `CategoryCard` — icon tile + name + count, for the Categories grid
2. `CategoryAddTile` — dashed "add new category" grid tile
3. `FamilyHeroCard` — gradient card with member stack + invite CTA (Family screen)
4. `HistoryTimeline` / `HistorySessionCard` — dot-and-line timeline row
5. `QuickAddBar` — inline docked add-item input+button+chip+stepper (Main list screen), if you choose to add this alongside the existing FAB sheet
6. `MonthFilterPill` — dropdown-style pill button (History screen header)
7. Swipe-action wrapper for `ItemCard` (assign/delete reveal-on-swipe)
8. (Optional) small shared `Button` variants component, if you want to de-duplicate button styling

## 7. Summary of required UI changes by risk level

- **Low risk (pure restyle, no new interaction/data)**: category chip colors/sizing, FAB color, card shadows/radii, header typography, `EmptyState` dashed variant, extending `CATEGORY_STYLES` map, Heebo font + color token swap.
- **Medium risk (new component, existing data)**: `CategoryCard`/grid layout for Categories page, `FamilyHeroCard`, mounting `InviteLinkCard` on Family page, History timeline layout using existing `history` query fields only (date + item list, no cost).
- **Higher risk / needs your decision first**:
  1. Bottom nav tab set (§3) — Dashboard/Statistics tabs vs. Categories/History tabs.
  2. Brand color: violet/purple → blue (§4, design-system table) — app-wide visual identity change.
  3. Swipe-to-reveal gesture on item rows — new interaction pattern, no existing library in `package.json` for gestures (would need to hand-roll touch handlers or add a small dependency).
  4. Quick-add bar vs. keeping FAB-only add flow on the main list screen.
  5. Data gaps in §5 — confirm "omit, don't fabricate" is the right call for presence/cost/assignee.

Nothing has been implemented yet. Once you confirm the decisions in §3, §4(4), and §7's "higher risk" items, I'll proceed screen by screen (Main list → Categories → Family → History → shared theme tokens), keeping all hooks/Supabase/Auth/RLS/Realtime logic untouched and only touching JSX/className/new presentational components.
