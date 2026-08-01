// src/import/knowledge/products.ts
// The knowledge base's actual product data - the single source of
// truth for "what is this product called, what category is it, what
// unit does it usually use". Every future import source (AI, OCR,
// Camera, Gallery, WhatsApp, Apple Notes/Reminders, CSV, Excel) is
// expected to reuse this module rather than hardcoding any of this
// itself (see index.ts).
//
// Deliberately ~17 entries covering the products this app's real
// category set (see categories.ts / theme/categoryStyles.ts) can
// confidently classify. Rice/pasta were considered and dropped: they
// don't map cleanly onto any existing category here (not produce, not
// dairy, not meat/fish) and guessing one would risk "inventing" a
// category placement the user didn't ask for.
import type { KnowledgeCategoryName } from './categories';
import { REQUIRED_ABBREVIATION_ALIASES } from './aliases';

export interface KnowledgeProduct {
  id: string;
  canonicalName: string;
  // Alternate spellings/names that should resolve to this same
  // product - excluding the canonical name itself (KnowledgeBase.ts
  // indexes that separately) and excluding brand-combo aliases (those
  // are generated from brands.ts, not listed here).
  aliases: string[];
  category: KnowledgeCategoryName;
  defaultUnit: string | null;
  // Optional, descriptive only - not consumed by matching logic.
  brand?: string;
  // Substrings that identify this product's "family" even across
  // inflections/forms not worth enumerating as full aliases (e.g.
  // "עגבני" catches עגבניה/עגבנייה/עגבניות alike). Keyword matches are
  // deliberately weaker than exact/alias matches - see
  // KnowledgeMatcher.ts's tier order and its confidence handling.
  keywords?: string[];
}

export const KNOWLEDGE_PRODUCTS: KnowledgeProduct[] = [
  {
    id: 'milk',
    canonicalName: 'חלב',
    aliases: ['Milk', 'milk'],
    category: 'מוצרי חלב',
    defaultUnit: 'ליטר',
  },
  {
    id: 'cucumber',
    canonicalName: 'מלפפון',
    aliases: ['cucumber', 'מלפפונים', REQUIRED_ABBREVIATION_ALIASES.cucumber],
    category: 'ירקות',
    defaultUnit: "יח'",
    keywords: ['מלפפון'],
  },
  {
    id: 'tomato',
    canonicalName: 'עגבנייה',
    aliases: ['tomato', REQUIRED_ABBREVIATION_ALIASES.tomato],
    category: 'ירקות',
    defaultUnit: 'ק"ג',
    keywords: ['עגבני'],
  },
  {
    id: 'potato',
    canonicalName: 'תפוח אדמה',
    aliases: ['potato', 'תפוחי אדמה', REQUIRED_ABBREVIATION_ALIASES.potato],
    category: 'ירקות',
    defaultUnit: 'ק"ג',
    keywords: ['תפוח אדמה', 'תפוחי אדמה'],
  },
  {
    id: 'apple',
    canonicalName: 'תפוח',
    aliases: ['apple', 'תפוחים'],
    category: 'פירות',
    defaultUnit: 'ק"ג',
  },
  {
    id: 'instant-coffee',
    canonicalName: 'קפה נמס',
    aliases: ['instant coffee', REQUIRED_ABBREVIATION_ALIASES.instantCoffee],
    category: 'משקאות',
    defaultUnit: "יח'",
  },
  {
    id: 'actimel',
    canonicalName: 'אקטימל',
    aliases: ['actimel'],
    category: 'מוצרי חלב',
    defaultUnit: "יח'",
    brand: 'דנונה',
  },
  {
    id: 'coke-zero',
    canonicalName: 'קוקה קולה זירו',
    aliases: ['coke zero', 'קולה זירו', 'קוקה קולה זירו'],
    category: 'משקאות',
    defaultUnit: "יח'",
    keywords: ['קולה זירו'],
  },
  {
    id: 'bread',
    canonicalName: 'לחם',
    aliases: ['bread'],
    category: 'מאפים',
    defaultUnit: "יח'",
  },
  {
    id: 'eggs',
    canonicalName: 'ביצים',
    aliases: ['eggs', 'egg', 'ביצה'],
    category: 'מוצרי חלב',
    defaultUnit: "יח'",
  },
  {
    id: 'cheese',
    canonicalName: 'גבינה',
    aliases: ['cheese'],
    category: 'מוצרי חלב',
    defaultUnit: 'גרם',
  },
  {
    id: 'yogurt',
    canonicalName: 'יוגורט',
    aliases: ['yogurt', 'yoghurt'],
    category: 'מוצרי חלב',
    defaultUnit: "יח'",
  },
  {
    id: 'banana',
    canonicalName: 'בננה',
    aliases: ['banana', 'בננות'],
    category: 'פירות',
    defaultUnit: 'ק"ג',
  },
  {
    id: 'onion',
    canonicalName: 'בצל',
    aliases: ['onion'],
    category: 'ירקות',
    defaultUnit: 'ק"ג',
  },
  {
    id: 'carrot',
    canonicalName: 'גזר',
    aliases: ['carrot'],
    category: 'ירקות',
    defaultUnit: 'ק"ג',
  },
  {
    id: 'chicken',
    canonicalName: 'עוף',
    aliases: ['chicken'],
    category: 'בשר ודגים',
    defaultUnit: 'ק"ג',
  },
  {
    id: 'meat',
    canonicalName: 'בשר',
    aliases: ['meat'],
    category: 'בשר ודגים',
    defaultUnit: 'ק"ג',
  },
];
