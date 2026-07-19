// src/components/lists/ListActionsSheet.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../LanguageContext';
import { listsLabels } from '../../i18n/lists';
import BottomSheet from '../ui/BottomSheet';
import type { ShoppingListSummary } from '../../hooks/useLists';

interface MemberRow {
  userId: string;
  email: string;
  role: 'owner' | 'member';
}

interface ListActionsSheetProps {
  open: boolean;
  onClose: () => void;
  list: ShoppingListSummary;
  isOwner: boolean;
  onRename: (name: string) => Promise<boolean>;
  onToggleArchive: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

type View = 'menu' | 'rename' | 'members' | 'deleteConfirm';

// Three-dot menu content for a single list row on the Lists page:
// rename / manage members / archive-unarchive / delete (owner only).
// Deliberately scoped to a single arbitrary `list` passed in as a prop,
// not the app-wide "active list" - useMembers.ts is tied to
// useActiveList()'s activeListId, which would require actually
// switching the active list just to manage a different one's members.
// This does its own small member query instead, same technique the
// pre-redesign Lists.tsx already used inline.
export default function ListActionsSheet({ open, onClose, list, isOwner, onRename, onToggleArchive, onDelete }: ListActionsSheetProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = listsLabels[language as 'he' | 'en'];

  const [view, setView] = useState<View>('menu');
  const [name, setName] = useState(list.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setView('menu');
      setName(list.name);
      setError('');
      setSubmitting(false);
    }
  }, [open, list.name]);

  const loadMembers = async () => {
    setMembersLoading(true);
    const { data: rows } = await supabase
      .from('list_members')
      .select('user_id, role')
      .eq('list_id', list.id)
      .order('role', { ascending: true });

    if (!rows) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }

    const userIds = rows.map((r) => r.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, email').in('id', userIds)
      : { data: [] as { id: string; email: string }[] };
    const emailByUserId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email]));

    setMembers(rows.map((r) => ({ userId: r.user_id, email: emailByUserId[r.user_id] ?? '', role: r.role })));
    setMembersLoading(false);
  };

  const openMembers = () => {
    setView('members');
    loadMembers();
  };

  const handleRemoveMember = async (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
    const { error: removeError } = await supabase
      .from('list_members')
      .delete()
      .eq('list_id', list.id)
      .eq('user_id', userId);
    if (removeError) {
      setError(t.genericError);
      loadMembers();
      return;
    }
    // Leaving the list yourself closes the sheet - there's nothing left
    // to manage from this side once you're no longer a member.
    if (userId === user?.id) onClose();
  };

  const handleRename = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    const ok = await onRename(name.trim());
    setSubmitting(false);
    if (!ok) {
      setError(t.genericError);
      return;
    }
    onClose();
  };

  const handleToggleArchive = async () => {
    setSubmitting(true);
    setError('');
    const ok = await onToggleArchive();
    setSubmitting(false);
    if (!ok) {
      setError(t.genericError);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setError('');
    const ok = await onDelete();
    setSubmitting(false);
    if (!ok) {
      setError(t.genericError);
      return;
    }
    onClose();
  };

  const titleFor: Record<View, string> = {
    menu: t.actionsLabel,
    rename: t.renameTitle,
    members: t.manageMembers,
    deleteConfirm: t.deleteConfirmTitle,
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={titleFor[view]}>
      {error && (
        <p className="text-sm font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {view === 'menu' && (
        <div className="flex flex-col gap-1 -mx-2">
          <MenuButton icon="✏️" label={t.rename} onClick={() => setView('rename')} />
          <MenuButton icon="👥" label={t.manageMembers} onClick={openMembers} />
          <MenuButton
            icon={list.archived ? '📤' : '🗄️'}
            label={list.archived ? t.unarchiveAction : t.archiveAction}
            onClick={handleToggleArchive}
            disabled={submitting}
          />
          {isOwner && (
            <MenuButton icon="🗑️" label={t.deleteAction} tone="danger" onClick={() => setView('deleteConfirm')} />
          )}
        </div>
      )}

      {view === 'rename' && (
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            placeholder={t.renamePlaceholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setView('menu')}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleRename}
              disabled={submitting || !name.trim()}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {t.save}
            </button>
          </div>
        </div>
      )}

      {view === 'members' && (
        <div className="space-y-2">
          {membersLoading ? (
            <p className="text-sm text-gray-400 py-2">…</p>
          ) : (
            members.map((m) => {
              const isSelf = m.userId === user?.id;
              const canRemove = isOwner ? m.role !== 'owner' : isSelf;
              return (
                <div key={m.userId} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {isSelf ? t.you : m.email || m.userId.slice(0, 8) + '…'}
                    </p>
                    <p className="text-xs text-gray-400">{m.role === 'owner' ? t.ownerBadge : t.memberBadge}</p>
                  </div>
                  {canRemove && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="flex-shrink-0 text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1"
                    >
                      {isSelf ? t.leaveListAction : t.removeMemberAction}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {view === 'deleteConfirm' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t.deleteConfirmBody}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setView('menu')}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {t.deleteConfirmButton}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  tone,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  tone?: 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium text-right transition-all disabled:opacity-50 ${
        tone === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}
