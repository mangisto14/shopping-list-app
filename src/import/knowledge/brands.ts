// src/import/knowledge/brands.ts
// Brand names that commonly prefix/suffix a product in real shopping
// lists (e.g. "חלב תנובה", "חלב טרה"). KnowledgeBase.ts generates one
// alias per (product x brand) pair from this list at module load, so
// adding a new brand here doesn't require hand-writing every combined
// alias string in products.ts. This is intentionally NOT a generic
// "strip any trailing word" brand-detection algorithm - only these
// explicit, curated combinations are recognized, so a real brand-name
// coincidence elsewhere in a product name can never misfire.
export interface KnowledgeBrand {
  name: string;
  // Ids of products (see products.ts) this brand is commonly seen with.
  productIds: string[];
}

export const KNOWLEDGE_BRANDS: KnowledgeBrand[] = [
  { name: 'תנובה', productIds: ['milk'] },
  { name: 'טרה', productIds: ['milk'] },
];
