import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useItems } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import { useMembers } from '../hooks/useMembers';
import type { Member } from '../components/ui/MemberAvatar';
import ShoppingHeader from '../components/shopping/ShoppingHeader';
import InviteMemberModal from '../components/shopping/InviteMemberModal';
import { getCategoryStyle } from '../theme/categoryStyles';
import ItemCard from '../components/shopping/ItemCard';
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

export default function ShoppingList() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { lists: realLists, activeListId, setActiveListId, loading: listsLoading } = useActiveList();

  const { items, addItem: addItemToList, toggleItem, renameItem, deleteItem } = useItems();
  const { categories } = useCategories();
  const { members: realMembers, currentUserId, inviteMember } = useMembers();

  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(true);
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
  // lists.
  const displayLists: ListInfo[] = useMemo(
    () =>
      realLists.map((l, i) => ({
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

  const visibleItems = useMemo(
    () => (selectedCategory === 'all' ? items : items.filter((i) => i.category_id === selectedCategory)),
    [items, selectedCategory]
  );

  const toBuyItems = useMemo(() => visibleItems.filter((i) => !i.is_done), [visibleItems]);
  const doneItems = useMemo(() => visibleItems.filter((i) => i.is_done), [visibleItems]);

  const categoryNameFor = (categoryId: string | null) => categories.find((c) => c.id === categoryId)?.name;

  const totalItems = items.length;

  if (listsLoading) {
    return <PageSkeleton />;
  }

  if (!activeListId) {
    return (
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <EmptyListsState onCreateFirst={() => navigate('/lists')} />
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-2 pb-28">
      <ListSwitcher
        lists={displayLists}
        activeList={activeList}
        onSelect={(id) => setActiveListId(id)}
        onCreateNew={() => setShowCreateListModal(true)}
      />

      <div className="mt-2">
        <ShoppingHeader
          title={activeList ? `${activeList.emoji} ${activeList.name}` : t.familyTitle}
          subtitle={t.subtitle}
          totalItems={totalItems}
          members={members}
          onInvite={() => setShowInviteModal(true)}
        />
      </div>

      <div className="mt-1.5">
        <QuickAddBar
          value={input}
          onChange={setInput}
          onSubmit={addItem}
          placeholder={t.placeholder}
          categories={categories}
          selectedCategoryLabel={effectiveAddCategoryName}
          onOpenCategoryPicker={openAddForm}
          quantity={addQuantity}
          onQuantityChange={setAddQuantity}
        />
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mt-3">
          <CategoryChip
            icon=""
            label={t.allCategories}
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
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
              />
            );
          })}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon="🛒" title={t.empty} size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-[13px] font-bold text-gray-500 tracking-wide px-1">
            {t.toBuyLabel} · {toBuyItems.length}
          </p>
          <ul className="space-y-2">
            {toBuyItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                categoryName={categoryNameFor(item.category_id)}
                onToggle={() => toggleItem(item)}
                onDelete={() => deleteItem(item.id)}
                onRename={renameItem}
              />
            ))}
          </ul>

          {doneItems.length > 0 && (
            <>
              <button
                onClick={() => setCompletedOpen((o) => !o)}
                className="w-full flex items-center justify-between px-1 pt-2 pb-0.5"
              >
                <span className="text-[13px] font-bold text-gray-500">
                  {t.completedSectionLabel} · {doneItems.length}
                </span>
                <svg
                  width="12"
                  height="7"
                  viewBox="0 0 12 7"
                  fill="none"
                  className={`transition-transform ${completedOpen ? '' : 'rotate-180'}`}
                  aria-hidden="true"
                >
                  <path d="M1 1l5 5 5-5" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {completedOpen && (
                <ul className="space-y-1.5">
                  {doneItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      categoryName={categoryNameFor(item.category_id)}
                      onToggle={() => toggleItem(item)}
                      onDelete={() => deleteItem(item.id)}
                      onRename={renameItem}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

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
        errorMessage={addItemError}
      />

      <FloatingAddButton onClick={() => (showAddForm ? closeAddForm() : openAddForm())} />

      <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={inviteMember} />

      <CreateListModal open={showCreateListModal} onClose={() => setShowCreateListModal(false)} />
    </div>
  );
}
