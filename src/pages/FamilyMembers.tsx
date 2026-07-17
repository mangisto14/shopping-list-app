// src/pages/FamilyMembers.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useActiveList } from '../ActiveListContext';
import { useMembers } from '../hooks/useMembers';
import EmptyListsState from '../components/lists/EmptyListsState';
import MemberAvatar from '../components/ui/MemberAvatar';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import FamilyHeroCard from '../components/shopping/FamilyHeroCard';
import InviteLinkCard from '../components/shopping/InviteLinkCard';
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

  const heroMembers = members.map((m) => ({
    id: m.userId,
    name: m.userId === currentUserId ? 'את/ה' : m.email || `${m.userId.slice(0, 8)}…`,
    avatar: m.email ? m.email.slice(0, 2).toUpperCase() : m.userId.slice(0, 2).toUpperCase(),
  }));

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-28 space-y-4">
      <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight px-1">משפחה</h1>

      <FamilyHeroCard
        listName={activeList?.name ?? 'הרשימה שלי'}
        members={heroMembers}
        onInvite={() => setShowInviteModal(true)}
        inviteLabel="הזמנת בן משפחה"
      />

      <p className="text-[13px] font-bold text-gray-500 px-1">חברים · {members.length}</p>

      {membersLoading ? (
        <EmptyState icon="⏳" title="טוען..." />
      ) : members.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon="👨‍👩‍👧"
          title="עדיין אין בני משפחה"
          description="שתפו קישור הזמנה כדי לנהל את הקניות יחד — כל שינוי מסתנכרן מיידית"
        />
      ) : (
        <div className="bg-white rounded-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] overflow-hidden">
          {members.map((m, i) => {
            const isMe = m.userId === currentUserId;
            const initials = m.email ? m.email.slice(0, 2).toUpperCase() : '··';
            const joinDate = new Date(m.joinedAt).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < members.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <MemberAvatar name={m.email || m.userId} avatar={initials} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                    <span dir="ltr">{m.email || `${m.userId.slice(0, 8)}…`}</span>
                    {isMe && <span className="text-xs font-normal text-gray-400">(את/ה)</span>}
                  </p>
                  <p className="text-[12.5px] font-medium text-gray-500">הצטרפ/ה ב-{joinDate}</p>
                </div>
                <span className="flex-shrink-0 text-[11.5px] font-bold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
                  {m.role === 'owner' ? 'מנהל/ת' : 'חבר/ה'}
                </span>
                {isOwner && m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    disabled={removingId === m.userId}
                    aria-label={language === 'he' ? 'הסר חבר' : 'Remove member'}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors px-1 disabled:opacity-40"
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <InviteLinkCard />

      <InviteMemberModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={inviteMember} />
    </div>
  );
}
