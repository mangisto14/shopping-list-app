// src/import/knowledge/index.ts
// Public barrel for the knowledge base module - the single source of
// truth for Smart Import's grocery knowledge (products, categories,
// units, aliases, brands). Every current and future pipeline module
// (Semantic Analyzer, and eventually AI/OCR/Camera/Gallery/WhatsApp/
// Apple Notes/Apple Reminders/CSV/Excel providers) must import from
// here rather than hardcoding grocery knowledge of its own.
export { knowledgeBase } from './KnowledgeBase';
export { matchProduct } from './KnowledgeMatcher';
export type { ProductMatchResult, ProductMatchTier } from './KnowledgeMatcher';
export { KNOWLEDGE_CATEGORIES } from './categories';
export type { KnowledgeCategoryName } from './categories';
export { normalizeUnit } from './units';
export type { KnowledgeProduct } from './products';
