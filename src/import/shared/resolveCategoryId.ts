// src/import/shared/resolveCategoryId.ts
// A category NAME (from the knowledge base, a learning correction, or
// the AI Assistant) is only ever resolved to a real, attachable
// `categoryId` if a category with that exact name already exists on
// this user's list - otherwise it stays `null`, even though the name
// itself still displays in Preview (see SemanticAnalyzer's own doc
// comment on this exact trade-off, first established there and now
// shared by every enrichment source instead of each one re-implementing
// its own copy of this lookup).
import type { ImportPipelineContext } from '../types';

export function resolveCategoryId(categoryName: string | null, context: ImportPipelineContext): string | null {
  if (!categoryName) return null;
  const match = context.existingCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  return match?.id ?? null;
}
