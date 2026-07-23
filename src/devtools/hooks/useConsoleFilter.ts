// src/devtools/hooks/useConsoleFilter.ts
// Backs both the search box and the "Favorites only" toggle in the
// console header. Both are just visibility filters over the same set
// of rows, so they share one `matches()` check instead of two separate
// code paths - a row (or a whole section) is visible when it passes
// both the text search (if any) and the favorites filter (if active).
import { useState } from 'react';
import { useFavoriteIds } from './useFavorites';

export function useConsoleFilter() {
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favoriteIds = useFavoriteIds();

  const matches = (label: string, id?: string): boolean => {
    if (favoritesOnly && (!id || !favoriteIds.includes(id))) return false;
    const query = search.trim().toLowerCase();
    if (query && !label.toLowerCase().includes(query)) return false;
    return true;
  };

  const anyMatch = (entries: { label: string; id?: string }[]): boolean => entries.some((e) => matches(e.label, e.id));

  // When either filter is active, force every section open so matches
  // aren't hidden behind a collapsed header.
  const forceExpanded = search.trim().length > 0 || favoritesOnly;

  return { search, setSearch, favoritesOnly, setFavoritesOnly, matches, anyMatch, forceExpanded };
}
