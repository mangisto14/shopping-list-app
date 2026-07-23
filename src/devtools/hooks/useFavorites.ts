// src/devtools/hooks/useFavorites.ts
// "Pin frequently used settings" - a plain set of setting ids (e.g.
// "swipe.revealThreshold"), persisted like every other devtools store.
// The console's search bar has a "Favorites only" toggle that filters
// down to exactly these ids, reusing the same visibility mechanism as
// a text search rather than duplicating each row into a second place.
import { createDevStore } from '../shared/createDevStore';

const store = createDevStore<{ ids: string[] }>('dev-settings:favorites', { ids: [] });

export function isFavorite(id: string): boolean {
  return store.get().ids.includes(id);
}

export function toggleFavorite(id: string): void {
  const { ids } = store.get();
  store.set({ ids: ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id] });
}

export function useFavoriteIds(): string[] {
  return store.useValue().ids;
}
