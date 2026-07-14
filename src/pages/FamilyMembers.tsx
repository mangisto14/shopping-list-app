// src/pages/FamilyMembers.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useActiveList } from '../ActiveListContext';
import EmptyListsState from '../components/lists/EmptyListsState';
import AppCard from '../components/ui/AppCard';
import MemberAvatar from '../components/ui/MemberAvatar';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';

interface Member {
  user_id: string;
}

// Mirrors the exact list_members query Lists.tsx already runs - no new
// hook, no new table, same real (if thin - no profiles table yet)
// membership data. Not wrapped in useItems/useCategories-style hook
// since no such hook exists for list_members; replicating the
// existing inline-query pattern rather than inventing a new
// abstraction for this Phase 1 pass.
export default function FamilyMembers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeList, activeListId, loading: listsLoading } = useActiveList();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!activeListId) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }
    setMembersLoading(true);
    supabase
      .from('list_members')
      .select('user_id')
      .eq('list_id', activeListId)
      .then(({ data, error }) => {
        if (!error && data) setMembers(data);
        setMembersLoading(false);
      });
  }, [activeListId]);

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
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-10 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800 px-1">בני המשפחה</h1>
        {activeList && <p className="text-xs text-gray-400 px-1 mt-0.5 truncate">{activeList.name}</p>}
      </div>

      {membersLoading ? (
        <EmptyState icon="⏳" title="טוען..." />
      ) : members.length === 0 ? (
        <EmptyState icon="👨‍👩‍👧" title="אין עדיין חברים ברשימה זו" />
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const isMe = m.user_id === user?.id;
            const isOwner = activeList?.owner_id === m.user_id;
            const name = isMe ? 'את/ה' : `${m.user_id.slice(0, 8)}…`;
            return (
              <AppCard key={m.user_id} className="flex items-center gap-3">
                <MemberAvatar name={name} avatar={m.user_id.slice(0, 2).toUpperCase()} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-400">{isOwner ? 'בעל/ת הרשימה' : 'חבר/ה'}</p>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
