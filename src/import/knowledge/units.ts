// src/import/knowledge/units.ts
// Unit-token normalization - a single canonical spelling per unit, so
// the rest of Smart Import (and eventually OCR/AI output) never has to
// special-case "קילו" vs "ק"ג" vs "קילוגרם" as different values.
// Canonical spellings match this app's existing convention (see
// src/import/ai/commonUnits.ts and RuleBasedNormalizer's QUANTITY_UNIT_RE).
//
// Keyed by a normalized (trimmed, lowercased for Latin, no surrounding
// quotes/punctuation stripped from the Hebrew forms since ק"ג's
// internal quote is meaningful) token - looked up as a WHOLE token,
// never as a substring, so a short synonym (e.g. "מל" for מ"ל) can
// never partial-match inside an unrelated word (e.g. "מלפפון").
const UNIT_SYNONYMS: Record<string, string> = {
  // Kilogram
  'קילו': 'ק"ג',
  'קילוגרם': 'ק"ג',
  'ק"ג': 'ק"ג',
  'קג': 'ק"ג',
  'kg': 'ק"ג',

  // Gram
  'גר': 'גרם',
  "גר'": 'גרם',
  'גרם': 'גרם',
  'גרמים': 'גרם',
  'g': 'גרם',
  'gram': 'גרם',
  'grams': 'גרם',

  // Unit/piece
  'יח': "יח'",
  "יח'": "יח'",
  'יחידה': "יח'",
  'יחידות': "יח'",
  'pcs': "יח'",
  'pc': "יח'",

  // Liter
  'ל': 'ליטר',
  'ליטר': 'ליטר',
  'ליטרים': 'ליטר',
  'l': 'ליטר',
  'liter': 'ליטר',
  'liters': 'ליטר',

  // Milliliter
  'מל': 'מ"ל',
  'מ"ל': 'מ"ל',
  'ml': 'מ"ל',
};

// Hebrew abbreviations (ק"ג, מ"ל) are keyed above with a plain ASCII
// quote, but real input commonly uses the dedicated Hebrew GERSHAYIM/
// GERESH punctuation marks (״ ׳) or curly quotes instead - e.g. a user
// typing "מ״ל" with the proper Hebrew punctuation mark, not the ASCII
// quote next to it on the keyboard. Folded to ASCII purely for this
// lookup, same normalization semantic/mergeKey.ts's own toAsciiQuotes
// already applies for merge-identity purposes - kept here too so every
// caller of normalizeUnit (parseQuantity's leading AND trailing forms)
// benefits automatically, not just merge identity.
function toAsciiQuotes(token: string): string {
  return token.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'");
}

// Whole-token lookup only - callers must pass one already-split token,
// never a full phrase (see the doc comment above for why).
export function normalizeUnit(token: string): string | null {
  const trimmed = toAsciiQuotes(token.trim());
  if (!trimmed) return null;
  return UNIT_SYNONYMS[trimmed] ?? UNIT_SYNONYMS[trimmed.toLowerCase()] ?? null;
}

// A unit is either a discrete, COUNTABLE purchase unit ("יח'" - a
// plain "piece", the only one in the vocabulary above), or a
// MEASUREMENT describing a single package's weight/volume (ק"ג/גרם/
// ליטר/מ"ל). The distinction matters once a number is attached to it:
// "חלב 2 ליטר" means "buy one 2-liter carton", not "buy 2 shopping
// units of milk" - the number describes the SIZE of what's being
// bought, not how many to buy. A bare number with no unit at all
// ("מלפפון 3") or a number attached to the countable unit ("3 יח'
// חלב") both genuinely mean "3 of these." Generic by construction -
// this has no idea what "milk" or "cornflakes" is, it only classifies
// the UNIT itself, so it applies identically to every product.
const MEASUREMENT_UNITS = new Set(['ק"ג', 'גרם', 'ליטר', 'מ"ל']);

export function isMeasurementUnit(canonicalUnit: string): boolean {
  return MEASUREMENT_UNITS.has(canonicalUnit);
}
