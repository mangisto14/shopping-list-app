import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { shoppingLabels } from '../i18n/shoppingList';
import { useActiveList } from '../ActiveListContext';
import { useItems, type Item } from '../hooks/useItems';
import { useCategories } from '../hooks/useCategories';
import ShoppingHeader from '../components/shopping/ShoppingHeader';
import ProgressBar from '../components/shopping/ProgressBar';
import ActivityFeed from '../components/shopping/ActivityFeed';
import MembersPanel from '../components/shopping/MembersPanel';
import InviteMemberModal from '../components/shopping/InviteMemberModal';
import CategorySection, { getCategoryStyle } from '../components/shopping/CategorySection';
import FloatingAddButton from '../components/shopping/FloatingAddButton';
import AddItemSheet from '../components/shopping/AddItemSheet';
import ListSwitcher from '../components/lists/ListSwitcher';
import CreateListModal from '../components/lists/CreateListModal';
import EmptyListsState from '../components/lists/EmptyListsState';
import type { ListInfo } from '../components/lists/ListCard';
import LiveStatusBanner from '../components/presence/LiveStatusBanner';
import PresencePanel, { mockPresence } from '../components/presence/PresencePanel';
import LiveActivityBanner from '../components/live/LiveActivityBanner';
import LiveEditingPanel from '../components/live/LiveEditingPanel';

// Deterministic fallback emoji per list, since the real `lists` table
// has no emoji column (adding one is a schema change, out of scope
// here). Indexed by position, not persisted or tied to list identity
// beyond "the Nth list in the array gets the Nth emoji".
const EMOJI_PALETTE = ['🏠', '🛒', '🛋️', '🚗', '✈️', '🎉', '🏡', '💼'];

// Literal fallback data from the task spec. Structurally this can only
// ever be used in an environment where useActiveList()'s real `lists`
// somehow ends up empty while activeListId is still set - which
// ActiveListContext's own logic never produces (a non-null
// activeListId always implies a non-empty real lists array), so this
// exists as a defensive no-op in production. Its actual purpose is
// letting this feature be built and demoed without a live backend
// connection.
const mockLists: ListInfo[] = [
  { id: '1', name: 'קניות שבועיות', emoji: '🏠', members: 3, items: 14 },
  { id: '2', name: 'איקאה', emoji: '🛋️', members: 2, items: 7 },
  { id: '3', name: 'טיול לצפון', emoji: '🚗', members: 4, items: 21 },
];

export default function ShoppingList() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = shoppingLabels[language as 'he' | 'en'];
  const { lists: realLists, activeListId, setActiveListId, loading: listsLoading } = useActiveList();

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

  // Real lists (if already available) enriched with the mock/derived
  // emoji and the real item_count added to useLists.ts - falls back to
  // the literal mock array only in the defensive scenario described
  // above.
  const displayLists: ListInfo[] = useMemo(() => {
    if (realLists.length === 0) return mockLists;
    return realLists.map((l, i) => ({
      id: l.id,
      name: l.name,
      emoji: EMOJI_PALETTE[i % EMOJI_PALETTE.length],
      members: l.member_count,
      items: l.item_count,
    }));
  }, [realLists]);

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

      <div className="flex items-center gap-2">
        <LiveStatusBanner users={mockPresence} />
        <LiveActivityBanner />
      </div>

      <ShoppingHeader
        title={activeList ? `${activeList.emoji} ${activeList.name}` : t.familyTitle}
        subtitle={t.subtitle}
        totalItems={totalItems}
        completedItems={completedItems}
        itemsLabel={t.itemsCount}
        completedLabel={t.completedCount}
        members={mockPresence}
        onInvite={() => setShowInviteModal(true)}
      />

      <ProgressBar
        totalItems={totalItems}
        completedItems={completedItems}
        label={t.progressLabel}
        remainingLabel={t.remainingLabel}
      />

      <ActivityFeed />

      <LiveEditingPanel />

      <PresencePanel />

      <MembersPanel onInvite={() => setShowInviteModal(true)} />

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((cat) => {
            const style = getCategoryStyle(cat.name);
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all border flex items-center gap-1 ${
                  active
                    ? `${style.fill} text-white border-transparent`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{style.icon}</span>
                {cat.name}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all border ${
              selectedCategory === 'all'
                ? 'bg-violet-500 text-white border-violet-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.allCategories}
          </button>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🛒</p>
          <p>{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
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
