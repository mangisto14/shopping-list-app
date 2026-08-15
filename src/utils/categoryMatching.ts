// src/utils/categoryMatching.ts
// The single, shared definition of "is this category name the same as
// that one" - case/whitespace-insensitive. Used both by
// useCategories.ts's addCategory (never insert a duplicate row) and by
// CategoryDropdown.tsx (decide whether "+ Create category" should
// appear at all) so the two can never quietly disagree about what
// counts as a duplicate.
export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

// Null for a blank/whitespace-only name - there's nothing to search
// for, and (by the same rule) nothing that could ever be created.
export function findMatchingCategory<T extends { name: string }>(categories: T[], name: string): T | null {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return null;
  return categories.find((c) => normalizeCategoryName(c.name) === normalized) ?? null;
}
