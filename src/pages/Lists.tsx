// src/pages/Lists.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useActiveList } from '../ActiveListContext';
import { useLanguage } from '../LanguageContext';
import { listsLabels } from '../i18n/lists';
import { supabase } from '../supabase/client';

interface Member {
  user_id: string;
}

export default function Lists() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = listsLabels[language as 'he' | 'en'];
  const { lists, loading, activeListId, setActiveListId, createList } = useActiveList();

  const [newListName, setNewListName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!activeListId) {
      setMembers([]);
      return;
    }
    supabase
      .from('list_members')
      .select('user_id')
      .eq('list_id', activeListId)
      .then(({ data, error }) => {
        if (!error && data) setMembers(data);
      });
  }, [activeListId]);

  const handleCreate = async () => {
    if (!newListName.trim()) return;
    const created = await createList(newListName);
    if (created) setNewListName('');
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">{t.title}</h2>

      <div className="flex mb-4 gap-2">
        <input
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder={t.createPlaceholder}
          className="border p-2 rounded flex-1"
        />
        <button onClick={handleCreate} className="bg-blue-500 text-white px-4 rounded">
          {t.create}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">...</p>
      ) : lists.length === 0 ? (
        <p className="text-center text-gray-500">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {lists.map((list) => {
            const isActive = list.id === activeListId;
            const isOwner = list.owner_id === user?.id;
            return (
              <li
                key={list.id}
                className={`p-3 rounded border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{list.name}</div>
                    <div className="text-xs text-gray-500">
                      {isOwner ? t.owner : t.member} · {list.member_count} {t.memberCount}
                    </div>
                  </div>
                  {isActive ? (
                    <span className="text-xs font-semibold text-blue-600">{t.active}</span>
                  ) : (
                    <button
                      onClick={() => setActiveListId(list.id)}
                      className="text-sm bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-100"
                    >
                      {t.select}
                    </button>
                  )}
                </div>

                {isActive && (
                  <div className="mt-3 border-t pt-2">
                    <div className="text-xs font-semibold text-gray-600 mb-1">{t.members}</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {members.map((m) => (
                        <li key={m.user_id}>
                          {m.user_id === user?.id ? t.you : `${m.user_id.slice(0, 8)}…`}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-400 mt-1">{t.membersUnavailable}</div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
