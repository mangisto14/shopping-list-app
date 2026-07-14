// src/pages/FamilyMembers.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useActiveList } from '../ActiveListContext';
import { useMembers } from '../hooks/useMembers';
import EmptyListsState from '../components/lists/EmptyListsState';
import AppCard from '../components/ui/AppCard';
import MemberAvatar from '../components/ui/MemberAvatar';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import InviteMemberButton from '../components/shopping/InviteMemberButton';
import InviteMemberModal from '../components/shopping/InviteMemberModal';

export default function FamilyMembers() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { activeList, activeListId, loading: listsLoading } = useActiveList();
  const { members, loading: membersLoading, isOwner, currentUserId, inviteMember, removeMember } = useMembers();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    await removeMember(userId);
    setRemovingId(null);
  };

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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-800 px-1">בני המשפחה</h1>
          {activeList && <p className="text-xs text-gray-400 px-1 mt-0.5 truncate">{activeList.name}</p>}
        </div>
        {isOwner && (
          <div className="flex-shrink-0">
            <InviteMemberButton onClick={() => setShowInviteModal(true)} variant="ghost" />
          </div>
        )}
      </div>

      {membersLoading ? (
        <EmptyState icon="⏳" title="טוען..." />
      ) : members.length === 0 ? (
        <EmptyState icon="👨‍👩‍👧" title="אין עדיין חברים ברשימה זו" />
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const isMe = m.userId === currentUserId;
            const initials = m.email ? m.email.slice(0, 2).toUpperCase() : '··';
            const joinDate = new Date(m.joinedAt).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <AppCard key={m.id} className="flex items-center gap-3">
                <MemberAvatar name={m.email || m.userId} avatar={initials} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1.5">
                    <span dir="ltr">{m.email || `${m.userId.slice(0, 8)}…`}</span>
                    {isMe && <span className="text-xs font-normal text-gray-400">(את/ה)</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.role === 'owner' ? 'בעל/ת הרשימה' : 'חבר/ה'} · הצטרפ/ה ב-{joinDate}
                  </p>
                </div>
                {isOwner && m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    disabled={removingId === m.userId}
                    aria-label={language === 'he' ? 'הסר חבר' : 'Remove member'}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors px-1 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                  >
                    🗑️
                  </button>
                )}
              </AppCard>
            );
          })}
        </div>
      )}

      <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={inviteMember} />
    </div>
  );
}
