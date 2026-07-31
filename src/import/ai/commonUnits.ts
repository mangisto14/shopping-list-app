// src/import/ai/commonUnits.ts
// A small, honest lookup table of common grocery items -> their
// typical unit. This is a real, working heuristic - not AI, not a
// vendor call - so it's deliberately kept low-confidence: it's a
// guess based on the item's name matching a known keyword, unrelated
// to anything the user actually typed about quantity, and is only
// ever offered as a pending suggestion the user must explicitly apply
// (see HeuristicTextUnderstandingEngine.ts), never auto-populated.
export const COMMON_UNIT_BY_KEYWORD: Record<string, string> = {
  'עגבני': 'ק"ג',
  'מלפפון': 'יח\'',
  'חלב': 'ליטר',
  'ביצים': 'יח\'',
  'לחם': 'יח\'',
  'תפוח אדמה': 'ק"ג',
  'תפוחי אדמה': 'ק"ג',
  'בננ': 'ק"ג',
  'תפוח': 'ק"ג',
  'בצל': 'ק"ג',
  'גזר': 'ק"ג',
  'יוגורט': 'יח\'',
  'גבינה': 'גרם',
  'בשר': 'ק"ג',
  'עוף': 'ק"ג',
  'אורז': 'ק"ג',
  'פסטה': 'גרם',
};

export function guessUnitFromName(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, unit] of Object.entries(COMMON_UNIT_BY_KEYWORD)) {
    if (lower.includes(keyword.toLowerCase())) return unit;
  }
  return null;
}
