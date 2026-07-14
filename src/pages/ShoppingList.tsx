import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useAuth } from '../hooks/useAuth';
import { useItems, type Item } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../supabase/client';
import type { Member } from '../components/ui/MemberAvatar';
import ShoppingHeader from '../components/shopping/ShoppingHeader';
import MembersPanel from '../components/shopping/MembersPanel';
import InviteMemberModal from '../components/shopping/InviteMemberModal';
import CategorySection, { getCategoryStyle } from '../components/shopping/CategorySection';
import FloatingAddButton from '../components/shopping/FloatingAddButton';
import AddItemSheet from '../components/shopping/AddItemSheet';
import ListSwitcher from '../components/lists/ListSwitcher';
import CreateListModal from '../components/lists/CreateListModal';
import EmptyListsState from '../components/lists/EmptyListsState';
import type { ListInfo } from '../components/lists/ListCard';
import PresencePanel from '../components/presence/PresencePanel';
import AppCard from '../components/ui/AppCard';
import ProgressBar from '../components/ui/ProgressBar';
import CategoryChip from '../components/ui/CategoryChip';
import EmptyState from '../components/ui/EmptyState';

// Deterministic fallback emoji per list, since the real `lists` table
// has no emoji column (adding one is a schema change, out of scope
// here). Indexed by position, not persisted or tied to list identity
// beyond "the Nth list in the array gets the Nth emoji".
const EMOJI_PALETTE = ['🏠', '🛒', '🛋️', '🚗', '✈️', '🎉', '🏡', '💼'];

export default function ShoppingList() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { user } = useAuth();
  const {
    lists: realLists,
    activeList: activeListReal,
    activeListId,
    setActiveListId,
    loading: listsLoading,
  } = useActiveList();

  const { items, addItem: addItemToList, toggleItem, renameItem, deleteItem } = useItems();
  const { categories } = useCategories();

  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  // Category chosen for the item currently being created. Deliberately
  // separate from `selectedCategory` (the page filter) - they used to
  // share one state, which meant picking a category in the add-item
  // sheet silently changed which items were visible on the page, and
  // leaving the filter on "all" while adding an item sent the literal
  // string "all" as category_id, which the categories FK rejects and
  // fails the insert with no feedback.
  const [addItemCategory, setAddItemCategory] = useState('');
  const [addItemError, setAddItemError] = useState('');

  // Real membership for the active list - same list_members query
  // Lists.tsx/FamilyMembers.tsx already run. Replaces the old
  // mockPresence array. No display name/avatar source exists yet (no
  // profiles table), so each member renders from their real user_id,
  // same convention FamilyMembers.tsx already established.
  const [rawMembers, setRawMembers] = useState<{ user_id: string }[]>([]);

  useEffect(() => {
    if (!activeListId) {
      setRawMembers([]);
      return;
    }
    supabase
      .from('list_members')
      .select('user_id')
      .eq('list_id', activeListId)
      .then(({ data, error }) => {
        if (!error && data) setRawMembers(data);
      });
  }, [activeListId]);

  const members: Member[] = useMemo(
    () =>
      rawMembers.map((m) => ({
        id: m.user_id,
        name: m.user_id === user?.id ? 'את/ה' : `${m.user_id.slice(0, 8)}…`,
        avatar: m.user_id.slice(0, 2).toUpperCase(),
      })),
    [rawMembers, user]
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
    // Preselect the active page filter if it's a real category; otherwise
    // default to the first available category. Leaves addItemCategory as
    // '' when there are no categories at all, which addItem below treats
    // as "no category required".
    setAddItemCategory(selectedCategory !== 'all' ? selectedCategory : categories[0]?.id ?? '');
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setAddItemError('');
  };

  const addItem = async () => {
    if (!input.trim()) return;
    if (categories.length > 0 && !addItemCategory) {
      setAddItemError('יש לבחור קטגוריה');
      return;
    }

    const success = await addItemToList(input, addItemCategory || null);
    if (!success) {
      setAddItemError('שגיאה בהוספת הפריט. נסה שוב.');
      return;
    }

    setInput('');
    setAddItemError('');
    setShowAddForm(false);
  };

  const visibleItems = useMemo(
    () => (selectedCategory === 'all' ? items : items.filter((i) => i.category_id === selectedCategory)),
    [items, selectedCategory]
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};

    // יצירת קבוצות לפי category_id
    visibleItems.forEach((item) => {
      const catId = item.category_id || 'uncategorized';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(item);
    });

    return groups;
  }, [visibleItems]);

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.is_done).length;
  const remainingItems = totalItems - completedItems;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (!listsLoading && !activeListId) {
    return (
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <EmptyListsState onCreateFirst={() => navigate('/lists')} />
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-28 space-y-4">
      <ListSwitcher
        lists={displayLists}
        activeList={activeList}
        onSelect={(id) => setActiveListId(id)}
        onCreateNew={() => setShowCreateListModal(true)}
      />

      <ShoppingHeader
        title={activeList ? `${activeList.emoji} ${activeList.name}` : t.familyTitle}
        subtitle={t.subtitle}
        totalItems={totalItems}
        completedItems={completedItems}
        itemsLabel={t.itemsCount}
        completedLabel={t.completedCount}
        members={members}
        onInvite={() => setShowInviteModal(true)}
      />

      <AppCard>
        <ProgressBar percentage={completionPercentage} />
        <div className="flex items-center justify-between mt-2.5 text-sm font-medium text-gray-500">
          <span>
            {remainingItems} {t.remainingLabel}
          </span>
          <span className="font-semibold text-violet-600">
            {completionPercentage}% {t.progressLabel}
          </span>
        </div>
      </AppCard>

      <PresencePanel members={members} />

      <MembersPanel members={members} ownerId={activeListReal?.owner_id} onInvite={() => setShowInviteModal(true)} />

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
          <CategoryChip
            icon=""
            label={t.allCategories}
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
        </div>
      )}

      {visibleItems.length === 0 ? (
        <EmptyState icon="🛒" title={t.empty} size="lg" />
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedItems).map(([catId, itemsInCategory]) => {
            const category = categories.find((c) => c.id === catId) ?? null;
            return (
              <CategorySection
                key={catId}
                category={category}
                items={itemsInCategory}
                uncategorizedLabel={t.uncategorized}
                onToggle={toggleItem}
                onDelete={deleteItem}
                onRename={renameItem}
              />
            );
          })}
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

      <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} />

      <CreateListModal open={showCreateListModal} onClose={() => setShowCreateListModal(false)} />
    </div>
  );
}
