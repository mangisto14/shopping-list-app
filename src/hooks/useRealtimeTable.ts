// src/hooks/useRealtimeTable.ts
// Shared subscribe/cleanup lifecycle for a single Supabase Realtime
// channel scoped to one table + one list. Both useItems and
// useCategories use this instead of duplicating channel setup.
import { useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
} from '@supabase/supabase-js';
import { isDevToolsEnabled, recordRealtimeEvent } from '../devtools';

interface RealtimeHandlers<T extends { id: string }> {
  onInsert: (row: T) => void;
  onUpdate: (row: T) => void;
  onDelete: (id: string) => void;
}

export function useRealtimeTable<T extends { id: string }>(
  table: 'items' | 'categories' | 'list_members',
  listId: string | null,
  handlers: RealtimeHandlers<T>
) {
  // Handlers close over state setters that are re-created every render.
  // Routing calls through a ref means the channel callbacks always run
  // the latest handler without needing `handlers` in the effect's
  // dependency array - which would otherwise tear down and recreate the
  // subscription on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!listId) return;

    // Dev/QA-only: feeds the Developer Console's Realtime Debug panel
    // ("Last Realtime Event"). isDevToolsEnabled() short-circuits this
    // to nothing in a production build - recordRealtimeEvent() isn't
    // even called, let alone its (trivial) cost paid.
    const devRecord = (event: 'INSERT' | 'UPDATE' | 'DELETE') => {
      if (isDevToolsEnabled()) recordRealtimeEvent({ table, event, listId });
    };

    const channel = supabase
      .channel(`${table}-list-${listId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `list_id=eq.${listId}` },
        (payload: RealtimePostgresInsertPayload<T>) => {
          devRecord('INSERT');
          handlersRef.current.onInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `list_id=eq.${listId}` },
        (payload: RealtimePostgresUpdatePayload<T>) => {
          devRecord('UPDATE');
          handlersRef.current.onUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter: `list_id=eq.${listId}` },
        (payload: RealtimePostgresDeletePayload<T>) => {
          devRecord('DELETE');
          const id = (payload.old as { id?: string }).id;
          if (id) handlersRef.current.onDelete(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, listId]);
}
