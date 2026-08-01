// src/import/knowledge/categories.ts
// The category names Smart Import's knowledge base is allowed to
// suggest - deliberately just a re-listing of theme/categoryStyles.ts's
// real, styled category names (not a parallel taxonomy). Kept as a
// literal union/array here rather than importing categoryStyles.ts's
// Record keys, so this module has zero dependency on the theme layer -
// the knowledge base is pure data and must not need to change if the
// app's color/icon styling ever does.
export type KnowledgeCategoryName =
  | 'מוצרי חלב'
  | 'בשר ודגים'
  | 'ירקות'
  | 'פירות'
  | 'ניקיון'
  | 'קפואים'
  | 'משקאות'
  | 'מאפים';

export const KNOWLEDGE_CATEGORIES: KnowledgeCategoryName[] = [
  'מוצרי חלב',
  'בשר ודגים',
  'ירקות',
  'פירות',
  'ניקיון',
  'קפואים',
  'משקאות',
  'מאפים',
];
