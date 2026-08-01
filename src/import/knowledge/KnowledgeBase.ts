// src/import/knowledge/KnowledgeBase.ts
// The facade every matcher/analyzer goes through - built ONCE at
// module load (a plain top-level object literal + Map construction,
// which ES modules already cache per the runtime's module registry),
// never re-parsed per call. See index.ts for why this file, not
// products.ts directly, is the module's public entry point.
import { normalizeForComparison } from '../ai/textUtils';
import { KNOWLEDGE_BRANDS } from './brands';
import { KNOWLEDGE_PRODUCTS, type KnowledgeProduct } from './products';

const productById = new Map<string, KnowledgeProduct>(KNOWLEDGE_PRODUCTS.map((product) => [product.id, product]));

// One lookup for "is this normalized string a known product name or
// alias" - built once here rather than re-scanning KNOWLEDGE_PRODUCTS
// on every call. Includes the canonical name itself (so callers never
// need to special-case "is this the canonical spelling or an alias"),
// every hand-written alias, and every brand x product combo generated
// from brands.ts (e.g. "חלב תנובה", "חלב טרה").
const aliasIndex = new Map<string, KnowledgeProduct>();

for (const product of KNOWLEDGE_PRODUCTS) {
  aliasIndex.set(normalizeForComparison(product.canonicalName), product);
  for (const alias of product.aliases) {
    aliasIndex.set(normalizeForComparison(alias), product);
  }
}

for (const brand of KNOWLEDGE_BRANDS) {
  for (const productId of brand.productIds) {
    const product = productById.get(productId);
    if (!product) continue;
    aliasIndex.set(normalizeForComparison(`${product.canonicalName} ${brand.name}`), product);
  }
}

export const knowledgeBase = {
  getProductById(id: string): KnowledgeProduct | null {
    return productById.get(id) ?? null;
  },
  getAllProducts(): KnowledgeProduct[] {
    return KNOWLEDGE_PRODUCTS;
  },
  // `normalizedText` must already be normalized (see ai/textUtils's
  // normalizeForComparison) - this is a plain Map lookup, never a
  // substring/partial match, so short aliases can never misfire inside
  // an unrelated word.
  lookupExactOrAlias(normalizedText: string): KnowledgeProduct | null {
    return aliasIndex.get(normalizedText) ?? null;
  },
};
