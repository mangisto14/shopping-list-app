// src/pages/Lists.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useActiveList } from '../ActiveListContext';
import { useLanguage } from '../LanguageContext';
import { listsLabels } from '../i18n/lists';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import ListActionsSheet from '../components/lists/ListActionsSheet';
import type { ShoppingListSummary } from '../hooks/useLists';

// Same deterministic, positional fallback emoji used by ShoppingList.tsx's
// list switcher - `lists` has no emoji column (persisting a custom icon
// is deferred, see ListActionsSheet/IMPLEMENTATION_PLAN.md), so this is
// purely decorative and not tied to list identity beyond array position.
const EMOJI_PALETTE = ['🏠', '🛒', '🛋️', '🚗', '✈️', '🎉', '🏡', '💼'];

export default function Lists() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = listsLabels[language as 'he' | 'en'];
  const { lists, loading, activeListId, setActiveListId, createList, updateListName, setListArchived, deleteList } =
    useActiveList();

  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuList, setMenuList] = useState<ShoppingListSummary | null>(null);

  const handleCreate = async () => {
    if (!newListName.trim() || creating) return;
    setCreating(true);
    const created = await createList(newListName);
    setCreating(false);
    if (created) setNewListName('');
  };

  const activeLists = lists.filter((l) => !l.archived);
  const archivedLists = lists.filter((l) => l.archived);

  const renderRow = (list: ShoppingListSummary, index: number) => {
    const isActive = list.id === activeListId;
    const isOwner = list.owner_id === user?.id;
    return (
      <li
        key={list.id}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
          isActive ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-100 bg-white'
        } ${list.archived ? 'opacity-60' : ''}`}
      >
        <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">
          {EMOJI_PALETTE[index % EMOJI_PALETTE.length]}
        </span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{list.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isOwner ? t.owner : t.member} · {list.member_count} {t.memberCount} · {list.item_count}{' '}
            {language === 'he' ? 'פריטים' : 'items'}
          </p>
        </div>

        {!list.archived &&
          (isActive ? (
            <span className="flex-shrink-0 text-xs font-semibold text-blue-600">{t.active}</span>
          ) : (
            <button
              onClick={() => setActiveListId(list.id)}
              className="flex-shrink-0 text-sm bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-100 transition-all"
            >
              {t.select}
            </button>
          ))}

        <button
          onClick={() => setMenuList(list)}
          aria-label={t.actionsLabel}
          className="flex-shrink-0 w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center text-lg transition-all"
        >
          ⋮
        </button>
      </li>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{t.title}</h2>

      <div className="flex mb-4 gap-2">
        <label htmlFor="new-list-input" className="sr-only">
          {t.createPlaceholder}
        </label>
        <input
          id="new-list-input"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={t.createPlaceholder}
          className="border border-gray-200 rounded-lg px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="bg-blue-500 text-white px-4 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {t.create}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="loading">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : lists.length === 0 ? (
        <EmptyState icon="🛍️" title={t.empty} />
      ) : (
        <>
          <ul className="space-y-2">{activeLists.map((list, i) => renderRow(list, i))}</ul>

          {archivedLists.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-gray-400 mb-2 px-1">{t.archivedSectionTitle}</p>
              <ul className="space-y-2">
                {archivedLists.map((list, i) => renderRow(list, activeLists.length + i))}
              </ul>
            </div>
          )}
        </>
      )}

      {menuList && (
        <ListActionsSheet
          open={Boolean(menuList)}
          onClose={() => setMenuList(null)}
          list={menuList}
          isOwner={menuList.owner_id === user?.id}
          onRename={(name) => updateListName(menuList.id, name)}
          onToggleArchive={() => setListArchived(menuList.id, !menuList.archived)}
          onDelete={() => deleteList(menuList.id)}
        />
      )}
    </div>
  );
}
