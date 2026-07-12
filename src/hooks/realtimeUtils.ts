// src/hooks/realtimeUtils.ts
// Pure, idempotent merge helpers shared by every realtime-backed hook.
// Used for local optimistic updates, direct-response confirmations, and
// incoming realtime events alike, so an echo of a client's own write is
// always a no-op rather than a duplicate.

export function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  const index = list.findIndex((item) => item.id === row.id);
  if (index === -1) return [...list, row];
  const next = list.slice();
  next[index] = row;
  return next;
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}
