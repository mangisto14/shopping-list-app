// src/hooks/useMembers.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';
import { useActiveList } from '../ActiveListContext';
import { useRealtimeTable } from './useRealtimeTable';
import { upsertById, removeById } from './realtimeUtils';

export interface ListMemberRow {
  id: string;
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Member {
  id: string;
  userId: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

// Real membership data: list_members joined (client-side, since
// list_members.user_id has no direct FK to profiles for PostgREST to
// auto-embed - it points at auth.users, which profiles also points at
// but doesn't replace) with profiles for email. Replaces the ad-hoc
// list_members-only queries previously duplicated in ShoppingList.tsx,
// Lists.tsx, and FamilyMembers.tsx.
export function useMembers() {
  const { user } = useAuth();
  const { activeListId } = useActiveList();
  const [rows, setRows] = useState<ListMemberRow[]>([]);
  const [emailByUserId, setEmailByUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!activeListId) {
      setRows([]);
      setEmailByUserId({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('list_members')
      .select('id, list_id, user_id, role, joined_at')
      .eq('list_id', activeListId)
      .order('joined_at', { ascending: true });

    if (!error && data) {
      setRows(data);
      const userIds = data.map((r) => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', userIds);
        if (profiles) {
          setEmailByUserId(Object.fromEntries(profiles.map((p) => [p.id, p.email])));
        }
      } else {
        setEmailByUserId({});
      }
    }
    setLoading(false);
  }, [activeListId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useRealtimeTable<ListMemberRow>('list_members', activeListId, {
    onInsert: (row) => setRows((prev) => upsertById(prev, row)),
    onUpdate: (row) => setRows((prev) => upsertById(prev, row)),
    onDelete: (id) => setRows((prev) => removeById(prev, id)),
  });

  // A realtime insert (e.g. someone else invited a member while we're
  // looking at the screen) can add a user_id we don't have an email
  // for yet - top up the map rather than refetching everything.
  useEffect(() => {
    const missing = [...new Set(rows.map((r) => r.user_id))].filter((id) => !(id in emailByUserId));
    if (missing.length === 0) return;
    supabase
      .from('profiles')
      .select('id, email')
      .in('id', missing)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEmailByUserId((prev) => ({ ...prev, ...Object.fromEntries(data.map((p) => [p.id, p.email])) }));
        }
      });
  }, [rows, emailByUserId]);

  const members: Member[] = rows
    .map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: emailByUserId[r.user_id] ?? '',
      role: r.role,
      joinedAt: r.joined_at,
    }))
    .sort((a, b) => (a.role === b.role ? a.joinedAt.localeCompare(b.joinedAt) : a.role === 'owner' ? -1 : 1));

  const isOwner = rows.some((r) => r.user_id === user?.id && r.role === 'owner');

  async function inviteMember(email: string): Promise<{ success: boolean; errorCode?: string }> {
    if (!activeListId) return { success: false, errorCode: 'generic' };
    const { error } = await supabase.rpc('invite_member_by_email', {
      p_list_id: activeListId,
      p_email: email.trim(),
    });
    if (error) return { success: false, errorCode: error.message };
    return { success: true };
  }

  async function removeMember(userId: string): Promise<boolean> {
    if (!activeListId) return false;
    const { error } = await supabase.from('list_members').delete().eq('list_id', activeListId).eq('user_id', userId);
    return !error;
  }

  return { members, loading, isOwner, currentUserId: user?.id, inviteMember, removeMember };
}
