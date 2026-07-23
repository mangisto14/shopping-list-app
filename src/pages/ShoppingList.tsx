import { useEffect, useMemo, useRef, useState } from 'react';
import UndoSnackbar from '../components/shopping/UndoSnackbar';
import DemoItemRow from '../components/shopping/DemoItemRow';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useItems, type Item } from '../hooks/useItems';
import { useCategories, type Category } from '../hooks/useCategories';
import { useMembers } from '../hooks/useMembers';
import type { Member } from '../components/ui/MemberAvatar';
import ShoppingHeader from '../components/shopping/ShoppingHeader';
import InviteMemberModal from '../components/shopping/InviteMemberModal';
import { getCategoryStyle } from '../theme/categoryStyles';
import ItemCard from '../components/shopping/ItemCard';
import CategorySection from '../components/shopping/CategorySection';
import QuickAddBar from '../components/shopping/QuickAddBar';
import FloatingAddButton from '../components/shopping/FloatingAddButton';
import AddItemSheet from '../components/shopping/AddItemSheet';
import ListSwitcher from '../components/lists/ListSwitcher';
import CreateListModal from '../components/lists/CreateListModal';
import EmptyListsState from '../components/lists/EmptyListsState';
import type { ListInfo } from '../components/lists/ListCard';
import CategoryChip from '../components/ui/CategoryChip';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';

// Deterministic fallback emoji per list, since the real `lists` table
// has no emoji column (adding one is a schema change, out of scope
// here). Indexed by position, not persisted or tied to list identity
// beyond "the Nth list in the array gets the Nth emoji".
const EMOJI_PALETTE = ['🏠', '🛒', '🛋️', '🚗', '✈️', '🎉', '🏡', '💼'];

interface CategoryGroup {
  categoryId: string | null; // null = uncategorized
  categoryName: string | null;
  items: Item[];
}

interface ItemCluster {
  key: string;
  representative: Item;
  ids: string[];
}

// Groups items with an identical name into one displayed row ("Nx").
// Deliberately keyed on exact name only - different names are never
// merged, even within the same category. Each underlying row is still
// its own `items` record; this is a display/interaction grouping layer
// only, not a schema change. Order is preserved (first occurrence
// order), so a cluster doesn't jump position when its count changes.
function clusterByName(items: Item[]): ItemCluster[] {
  const clusters = new Map<string, ItemCluster>();
  for (const item of items) {
    const existing = clusters.get(item.name);
    if (existing) {
      existing.ids.push(item.id);
    } else {
      clusters.set(item.name, { key: item.name, representative: item, ids: [item.id] });
    }
  }
  return [...clusters.values()];
}

const collapsedGroupsStorageKey = (listId: string) => `shopping-list:collapsedGroups:${listId}`;

// Reads persisted collapse state for a list, defaulting to "everything
// expanded" (empty set) if there's nothing stored yet, storage is
// unavailable, or the stored value is corrupt.
function readCollapsedGroups(listId: string | null): Set<string> {
  if (!listId) return new Set();
  try {
    const raw = localStorage.getItem(collapsedGroupsStorageKey(listId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Groups items by category, preserving the categories list's own order,
// with any uncategorized items collected into a trailing group. Empty
// groups are dropped - a category with nothing in this section (e.g. no
// completed dairy items yet) shouldn't render an empty header.
function groupByCategory(items: Item[], categories: Category[]): CategoryGroup[] {
  const byId = new Map<string, CategoryGroup>(
    categories.map((c) => [c.id, { categoryId: c.id, categoryName: c.name, items: [] }])
  );
  const uncategorized: CategoryGroup = { categoryId: null, categoryName: null, items: [] };

  for (const item of items) {
    const group = (item.category_id && byId.get(item.category_id)) || uncategorized;
    group.items.push(item);
  }

  const groups = [...byId.values()].filter((g) => g.items.length > 0);
  if (uncategorized.items.length > 0) groups.push(uncategorized);
  return groups;
}

export default function ShoppingList() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { lists: realLists, activeListId, setActiveListId, loading: listsLoading, error: listsError } = useActiveList();

  const { items, addItem: addItemToList, toggleItem, renameItem, deleteItem } = useItems();
  const { categories } = useCategories();
  const { members: realMembers, currentUserId, inviteMember } = useMembers();

  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  // Collapsed category groups, keyed "todo:<categoryId|none>" /
  // "done:<categoryId|none>" so the same category can be independently
  // collapsed in the active vs. completed sections. Persisted to
  // localStorage per list, so a collapsed section stays collapsed
  // across reloads/navigation. Default: everything expanded.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => readCollapsedGroups(activeListId));

  // Reload persisted state when the active list itself changes (this
  // page doesn't remount on a list switch) - a stale in-memory Set from
  // the previous list would otherwise leak across lists.
  useEffect(() => {
    setCollapsedGroups(readCollapsedGroups(activeListId));
  }, [activeListId]);

  useEffect(() => {
    if (!activeListId) return;
    localStorage.setItem(collapsedGroupsStorageKey(activeListId), JSON.stringify([...collapsedGroups]));
  }, [collapsedGroups, activeListId]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  // Which section (to-buy/completed) a just-toggled item should keep
  // rendering in for a short window after the tap, so the checkbox's
  // fill/fade transition has time to play before the item jumps to the
  // other section - avoids an abrupt re-render on every toggle. The real
  // toggleItem() mutation still fires immediately; this only delays
  // which section the item is *rendered* in, not when the data changes.
  const [pendingMoves, setPendingMoves] = useState<Map<string, 'todo' | 'done'>>(new Map());
  const pendingMoveTimeouts = useRef<Map<string, number>>(new Map());
  const TOGGLE_TRANSITION_MS = 200;

  // Swipe-delete Undo: a soft-delete window. The item is never actually
  // removed via deleteItem() until the timer below elapses - it's just
  // filtered out of what's rendered (see visibleItems). Undo simply
  // clears this state, and the item reappears untouched since useItems()
  // never lost it. Only one removal is undo-able at a time; a second
  // swipe-delete while one is already pending finalizes the earlier one
  // immediately rather than losing track of it.
  const UNDO_WINDOW_MS = 5000;
  const GROUP_CLOSE_FADE_MS = 300;
  interface PendingRemoval {
    ids: string[];
    label: string;
    timeoutId: number;
  }
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const commitRemoval = (removal: PendingRemoval) => {
    removal.ids.forEach((id) => deleteItem(id));
  };

  const scheduleRemoval = (ids: string[], label: string) => {
    setPendingRemoval((current) => {
      if (current) {
        window.clearTimeout(current.timeoutId);
        commitRemoval(current);
      }
      const timeoutId = window.setTimeout(() => {
        setPendingRemoval((latest) => {
          if (latest && latest.timeoutId === timeoutId) {
            commitRemoval(latest);
            return null;
          }
          return latest;
        });
      }, UNDO_WINDOW_MS);
      return { ids, label, timeoutId };
    });
  };

  const handleUndo = () => {
    setPendingRemoval((current) => {
      if (current) window.clearTimeout(current.timeoutId);
      return null;
    });
  };

  // Switching lists invalidates any in-flight removal (it referenced the
  // previous list's item ids) - finalize it immediately rather than
  // leaving a dangling timer or silently losing the delete.
  useEffect(() => {
    return () => {
      setPendingRemoval((current) => {
        if (current) {
          window.clearTimeout(current.timeoutId);
          commitRemoval(current);
        }
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId]);

  // Category headers that just emptied out due to a pending removal -
  // kept mounted a little longer, fading out instead of vanishing the
  // instant their last item is soft-deleted. Section-scoped so the same
  // category can close independently in the to-buy vs. completed list.
  interface ClosingGroup {
    key: string;
    categoryId: string | null;
    categoryName: string | null;
  }
  const [closingGroups, setClosingGroups] = useState<ClosingGroup[]>([]);
  const closingGroupTimeouts = useRef<Map<string, number>>(new Map());
  // Quick-add "quantity": no `quantity` column on `items` (schema change,
  // out of scope), so this controls how many copies of the same item
  // addItem() below inserts - a UI-only interpretation of the stepper,
  // not a new persisted field.
  const [addQuantity, setAddQuantity] = useState(1);
  // Category chosen for the item currently being created. Deliberately
  // separate from `selectedCategory` (the page filter) - they used to
  // share one state, which meant picking a category in the add-item
  // sheet silently changed which items were visible on the page, and
  // leaving the filter on "all" while adding an item sent the literal
  // string "all" as category_id, which the categories FK rejects and
  // fails the insert with no feedback.
  const [addItemCategory, setAddItemCategory] = useState('');
  const [addItemError, setAddItemError] = useState('');

  // The category QuickAddBar/AddItemSheet will submit with: the
  // explicitly chosen addItemCategory, falling back to the first
  // available category so the docked quick-add bar always has a valid
  // selection to show, even before the full sheet has ever been opened.
  const effectiveAddCategoryId = addItemCategory || categories[0]?.id || '';
  const effectiveAddCategoryName = categories.find((c) => c.id === effectiveAddCategoryId)?.name ?? '';

  // Real membership for the active list via useMembers (list_members +
  // profiles, real email, Realtime-backed) - mapped into the Member
  // shape ShoppingHeader already expects, now with a real email instead
  // of a truncated user_id.
  const members: Member[] = useMemo(
    () =>
      realMembers.map((m) => ({
        id: m.userId,
        name: m.userId === currentUserId ? 'את/ה' : m.email || `${m.userId.slice(0, 8)}…`,
        avatar: m.email ? m.email.slice(0, 2).toUpperCase() : m.userId.slice(0, 2).toUpperCase(),
      })),
    [realMembers, currentUserId]
  );

  // Real lists enriched with the deterministic emoji and real
  // item_count from useLists.ts. No mock fallback: an empty realLists
  // array now renders as an honest empty list, not fabricated demo
  // lists. Archived lists are deliberately excluded here - the quick
  // switcher is for actively-used lists; archived ones are only
  // reachable (and restorable) from the Lists page.
  const displayLists: ListInfo[] = useMemo(
    () =>
      realLists
        .filter((l) => !l.archived)
        .map((l, i) => ({
          id: l.id,
          name: l.name,
          emoji: EMOJI_PALETTE[i % EMOJI_PALETTE.length],
          members: l.member_count,
          items: l.item_count,
        })),
    [realLists]
  );

  const activeList = displayLists.find((l) => l.id === activeListId) ?? null;

  const openAddForm = () => {
    setAddItemError('');
    setAddItemCategory(effectiveAddCategoryId);
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setAddItemError('');
  };

  const addItem = async () => {
    if (!input.trim()) return;
    if (categories.length > 0 && !effectiveAddCategoryId) {
      setAddItemError('יש לבחור קטגוריה');
      return;
    }

    // "Quantity" adds this many separate rows via the same, unmodified
    // addItem call - see addQuantity's declaration above.
    for (let i = 0; i < addQuantity; i++) {
      const success = await addItemToList(input, effectiveAddCategoryId || null);
      if (!success) {
        setAddItemError('שגיאה בהוספת הפריט. נסה שוב.');
        return;
      }
    }

    setInput('');
    setAddItemError('');
    setAddQuantity(1);
    setShowAddForm(false);
  };

  const visibleItems = useMemo(() => {
    const byCategory = selectedCategory === 'all' ? items : items.filter((i) => i.category_id === selectedCategory);
    if (!pendingRemoval) return byCategory;
    return byCategory.filter((i) => !pendingRemoval.ids.includes(i.id));
  }, [items, selectedCategory, pendingRemoval]);

  const sectionFor = (item: Item): 'todo' | 'done' => pendingMoves.get(item.id) ?? (item.is_done ? 'done' : 'todo');
  const toBuyItems = useMemo(() => visibleItems.filter((i) => sectionFor(i) === 'todo'), [visibleItems, pendingMoves]);
  const doneItems = useMemo(() => visibleItems.filter((i) => sectionFor(i) === 'done'), [visibleItems, pendingMoves]);

  const toBuyGroups = useMemo(() => groupByCategory(toBuyItems, categories), [toBuyItems, categories]);
  const doneGroups = useMemo(() => groupByCategory(doneItems, categories), [doneItems, categories]);

  const handleToggle = (item: Item) => {
    const currentSection: 'todo' | 'done' = item.is_done ? 'done' : 'todo';
    setPendingMoves((prev) => new Map(prev).set(item.id, currentSection));
    toggleItem(item);

    // Rapid re-toggle guard: if this item is tapped again before its
    // previous cleanup timer fires, cancel that older timer so it can't
    // delete the *newer* pendingMoves entry early (which would snap the
    // item to the wrong section mid-transition instead of respecting
    // the fresh 200ms window this toggle just started).
    const existingTimeout = pendingMoveTimeouts.current.get(item.id);
    if (existingTimeout !== undefined) window.clearTimeout(existingTimeout);

    const timeoutId = window.setTimeout(() => {
      setPendingMoves((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Map(prev);
        next.delete(item.id);
        return next;
      });
      pendingMoveTimeouts.current.delete(item.id);
    }, TOGGLE_TRANSITION_MS);
    pendingMoveTimeouts.current.set(item.id, timeoutId);
  };

  const totalItems = items.length;

  // When the list is empty, a one-time non-interactive DemoItemRow plays
  // the swipe-discovery animation first, then fades out before the real
  // empty state appears. Resets whenever the list goes from non-empty
  // back to empty, so the demo plays fresh each time that happens.
  const [demoRowDone, setDemoRowDone] = useState(false);
  useEffect(() => {
    if (visibleItems.length > 0) setDemoRowDone(false);
  }, [visibleItems.length]);

  // Fade the empty state in once the demo row (if any) has finished,
  // rather than snapping straight to it.
  const [emptyStateVisible, setEmptyStateVisible] = useState(false);
  useEffect(() => {
    if (visibleItems.length === 0 && demoRowDone) {
      const id = requestAnimationFrame(() => setEmptyStateVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setEmptyStateVisible(false);
  }, [visibleItems.length, demoRowDone]);

  if (listsLoading) {
    return <PageSkeleton />;
  }

  // Distinct from "you genuinely have zero lists": the lists fetch
  // itself failed, so we don't actually know the real state. Showing
  // the same "create your first list" empty state here would look
  // exactly like data loss - see ROOT_CAUSE_ANALYSIS.md.
  if (listsError) {
    return (
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto  sm:px-4 pt-4">
        <EmptyState
          icon="⚠️"
          title="לא ניתן לטעון את הרשימות"
          description="אירעה שגיאה בטעינת הנתונים. הרשימות והפריטים שלך לא נמחקו - נסה/י שוב."
          actionLabel="נסה שוב"
          onAction={() => window.location.reload()}
          size="lg"
        />
      </div>
    );
  }

  if (!activeListId) {
    return (
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto  sm:px-4 pt-4">
        <EmptyListsState onCreateFirst={() => navigate('/lists')} />
      </div>
    );
  }

  // Swipe/tap delete on a grouped row is destructive: it removes every
  // unit in the cluster, never just one - per explicit product decision,
  // decreasing quantity is only done via the +/- controls, not swipe-
  // delete. The actual deleteItem() calls are deferred behind the Undo
  // window (scheduleRemoval) rather than fired immediately - see the
  // pendingRemoval state above.
  const handleClusterDelete = (group: CategoryGroup, key: string, ids: string[], label: string) => {
    if (ids.length === group.items.length) {
      const existingTimeout = closingGroupTimeouts.current.get(key);
      if (existingTimeout !== undefined) window.clearTimeout(existingTimeout);
      setClosingGroups((prev) => [
        ...prev.filter((g) => g.key !== key),
        { key, categoryId: group.categoryId, categoryName: group.categoryName },
      ]);
      const timeoutId = window.setTimeout(() => {
        setClosingGroups((prev) => prev.filter((g) => g.key !== key));
        closingGroupTimeouts.current.delete(key);
      }, GROUP_CLOSE_FADE_MS + 150);
      closingGroupTimeouts.current.set(key, timeoutId);
    }
    scheduleRemoval(ids, label);
  };

  // `closing` renders a just-emptied category header with no children,
  // fading out via the wrapping div rather than vanishing the instant
  // its last item is soft-deleted. The wrapper stays structurally
  // identical (same key, same div) whether live or closing, so React
  // reuses the DOM node and the opacity change actually transitions.
  // `firstGroup` marks the very first to-buy group, so its very first
  // cluster is "the first rendered shopping item in the list" - the one
  // and only row that plays the discovery animation. No other lookup or
  // expand-state check involved - if that group happens to be
  // collapsed, its rows (and the hint) simply never mount, which is
  // fine.
  const renderGroup = (group: CategoryGroup, section: 'todo' | 'done', closing = false, firstGroup = false) => {
    const key = `${section}:${group.categoryId ?? 'none'}`;
    const clusters = closing ? [] : clusterByName(group.items);
    return (
      <div key={key} className={`transition-opacity duration-300 ${closing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <CategorySection
          categoryName={group.categoryName}
          count={closing ? 0 : group.items.length}
          expanded={!closing && !collapsedGroups.has(key)}
          onToggleExpanded={() => toggleGroup(key)}
        >
          {clusters.map((cluster, index) => (
            <ItemCard
              key={cluster.key}
              item={cluster.representative}
              count={cluster.ids.length}
              categoryName={group.categoryName ?? undefined}
              onToggle={() => handleToggle(cluster.representative)}
              onDelete={() => handleClusterDelete(group, key, cluster.ids, cluster.representative.name)}
              onRename={(newName) => cluster.ids.forEach((id) => renameItem(id, newName))}
              onIncrement={() => addItemToList(cluster.representative.name, cluster.representative.category_id)}
              onDecrement={() => deleteItem(cluster.ids[cluster.ids.length - 1])}
              playEntryHint={firstGroup && index === 0}
            />
          ))}
        </CategorySection>
      </div>
    );
  };

  const renderClosingGroups = (section: 'todo' | 'done', liveGroups: CategoryGroup[]) => {
    const liveKeys = new Set(liveGroups.map((g) => `${section}:${g.categoryId ?? 'none'}`));
    return closingGroups
      .filter((g) => g.key.startsWith(`${section}:`) && !liveKeys.has(g.key))
      .map((g) => renderGroup({ categoryId: g.categoryId, categoryName: g.categoryName, items: [] }, section, true));
  };

  const closingDoneGroups = renderClosingGroups('done', doneGroups);

  return (
    <div
      className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto  sm:px-4 flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 3rem)' }}
    >
      {/* Single sticky Top Panel: list switcher, header (title +
          member/item-count stats), quick-add, category filter chips.
          These render together as one flex-shrink-0 block - none of
          them are individually sticky/positioned, they just never enter
          the scrollable region below. `calc(100dvh - 3rem)` + explicit
          overflow-hidden on this page container accounts for App.jsx's
          own h-12 chrome row above this page, so this container's
          height plus that row always exactly fills the viewport - the
          only scrolling region in the whole app is the <main> item list
          below, never this page container or the document itself. */}
      <div className="flex-shrink-0 pt-1">
        <ListSwitcher
          lists={displayLists}
          activeList={activeList}
          onSelect={(id) => setActiveListId(id)}
          onCreateNew={() => setShowCreateListModal(true)}
        />

        <div className="mt-1">
          <ShoppingHeader
            title={activeList ? `${activeList.emoji} ${activeList.name}` : t.familyTitle}
            subtitle={t.subtitle}
            totalItems={totalItems}
            members={members}
            onInvite={() => setShowInviteModal(true)}
          />
        </div>

        <div className="mt-1">
          <QuickAddBar
            value={input}
            onChange={setInput}
            onSubmit={addItem}
            placeholder={t.placeholder}
            categories={categories}
            selectedCategoryId={effectiveAddCategoryId}
            selectedCategoryLabel={effectiveAddCategoryName}
            onSelectCategory={(id) => {
              setAddItemCategory(id);
              setAddItemError('');
            }}
            quantity={addQuantity}
            onQuantityChange={setAddQuantity}
          />
        </div>

        {categories.length > 0 && (
          <div
            className="flex gap-2.5 overflow-x-auto scroll-smooth pb-1 -mx-1 px-1 mt-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <CategoryChip
              icon=""
              label={t.allCategories}
              active={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              variant="filter"
            />
            {categories.map((cat) => {
              const style = getCategoryStyle(cat.name);
              return (
                <CategoryChip
                  key={cat.id}
                  icon={style.icon}
                  label={cat.name}
                  active={selectedCategory === cat.id}
                  activeClassName={style.fill}
                  onClick={() => setSelectedCategory(cat.id)}
                  variant="filter"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* The one and only scrolling region in the app. Bottom padding
          clears the fixed BottomNav (h-16 + safe-area-inset-bottom) so
          the last row is never hidden behind it. */}
      <main
        className="flex-1 overflow-y-auto min-h-0 pt-3"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 16px)' }}
      >
        {visibleItems.length === 0 ? (
          !demoRowDone ? (
            <DemoItemRow label="חלב 3%" onFinished={() => setDemoRowDone(true)} />
          ) : (
            <div className={`transition-opacity duration-300 ${emptyStateVisible ? 'opacity-100' : 'opacity-0'}`}>
              <EmptyState
                icon="🛒"
                title={t.empty}
                description={t.emptyDescription}
                actionLabel={t.addItemTitle}
                onAction={openAddForm}
                size="lg"
              />
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2.5">
            {toBuyGroups.map((group, index) => renderGroup(group, 'todo', false, index === 0))}
            {renderClosingGroups('todo', toBuyGroups)}

            {(doneGroups.length > 0 || closingDoneGroups.length > 0) && (
              <>
                <div className="border-t border-gray-100 pt-2 mt-1">
                  <p className="text-[13px] font-bold text-gray-500 px-1">
                    {t.completedSectionLabel} · {doneItems.length}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {doneGroups.map((group) => renderGroup(group, 'done'))}
                  {closingDoneGroups}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <AddItemSheet
        open={showAddForm}
        onClose={closeAddForm}
        title={t.addItemTitle}
        placeholder={t.placeholder}
        value={input}
        onChange={setInput}
        onSubmit={addItem}
        submitLabel={t.addToListButton}
        categories={categories}
        categoryLabel={t.categoryLabel}
        selectedCategory={addItemCategory}
        onSelectCategory={(id) => {
          setAddItemCategory(id);
          setAddItemError('');
        }}
        quantity={addQuantity}
        onQuantityChange={setAddQuantity}
        errorMessage={addItemError}
      />

      <FloatingAddButton onClick={() => (showAddForm ? closeAddForm() : openAddForm())} />

      <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={inviteMember} />

      <CreateListModal open={showCreateListModal} onClose={() => setShowCreateListModal(false)} />

      {pendingRemoval && <UndoSnackbar label={`${pendingRemoval.label} נמחק`} onUndo={handleUndo} />}
    </div>
  );
}
