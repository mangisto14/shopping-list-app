// src/import/semantic/mergeKey.ts
// The generic, product-agnostic merge identity (see docs/smart-import-
// architecture.md's "Generic merge identity" section for the full
// rationale). Two products should be treated as "the same shopping-
// list group" when they differ ONLY in how much of them there is -
// "חלב" / "חלב 3%" / "חלב 500 מ״ל" are all milk - but never when they
// differ in WHAT they are - "חלב שקדים" (almond milk) and "חלב סויה"
// (soy milk) are each their own product. This file has zero knowledge
// of milk, rice, or any specific product: it only recognizes the SHAPE
// of a quantity/size/percentage token and strips it, keeping every
// other word untouched and in its original order. Adding a new
// product to the knowledge base never requires touching this file.
import { normalizeUnit } from '../knowledge/units';

// Hebrew abbreviations (ק"ג, מ"ל) are canonically written here with a
// plain ASCII quote (see units.ts), but real input commonly uses the
// dedicated Hebrew GERSHAYIM/GERESH punctuation marks (״ ׳) or curly
// quotes instead - folded to ASCII purely for this token check; the
// unit vocabulary itself (units.ts) is untouched.
function toAsciiQuotes(token: string): string {
  return token.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'");
}

// A small, generic Hebrew SIZE-DESCRIPTOR vocabulary - not product-
// specific (it applies identically to "חלב גדול", "לחם גדול", "קורנפלקס
// גדול", or any other product), the same kind of hand-curated,
// product-agnostic word list already established for units (see
// knowledge/units.ts's UNIT_SYNONYMS). Unlike a number/percent/
// multiplier/unit, these are plain words with no distinctive SHAPE, so
// there's no way to recognize them structurally the way isSizeToken's
// other checks do - a short, explicit list is the only option. Affects
// merge identity ONLY (per this file's own doc comment on why it's
// "more aggressive" than parseQuantity.ts): the parsed quantity and
// the displayed/stored name are untouched - "קורנפלקס גדול" still
// parses and displays exactly as before, but now shares one merge
// identity with a plain "קורנפלקס" for grouping and category-learning
// purposes.
const SIZE_DESCRIPTOR_WORDS = new Set([
  'גדול', 'גדולה',
  'קטן', 'קטנה',
  'בינוני', 'בינונית',
  'ענק', 'ענקית',
  'מיני', "ג'מבו", 'jumbo', 'mini',
]);

const NUMBER_RE = /^\d+(?:[.,]\d+)?$/;
const PERCENT_RE = /^\d+(?:[.,]\d+)?%$/;
const MULTIPLIER_RE = /^(?:[x×]\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?[x×])$/i;
// A number fused directly onto a unit or percent sign with no space -
// "500מ״ל", "1.5ליטר", "3%" (already caught by PERCENT_RE, but a fused
// unit like "500גרם" needs its numeric prefix split off first).
const FUSED_NUMBER_SUFFIX_RE = /^(\d+(?:[.,]\d+)?)(.+)$/;

// Whether one whitespace-separated token is pure quantity/size
// information - a bare number, a percentage, a multiplier, a known
// unit synonym, or a number fused onto one of those with no space.
// Never product-specific: this has no idea what "milk" or "rice" is,
// it only recognizes the SHAPE of a quantity/size token.
function isSizeToken(rawToken: string): boolean {
  const token = toAsciiQuotes(rawToken);
  if (NUMBER_RE.test(token) || PERCENT_RE.test(token) || MULTIPLIER_RE.test(token)) return true;
  if (normalizeUnit(token)) return true;
  if (SIZE_DESCRIPTOR_WORDS.has(token.toLowerCase())) return true;

  const fused = token.match(FUSED_NUMBER_SUFFIX_RE);
  if (fused) {
    const suffix = fused[2];
    if (suffix === '%' || normalizeUnit(suffix)) return true;
  }
  return false;
}

// Strips every quantity/size token from `name`, wherever it appears -
// not just at an edge like parseQuantity.ts (which only reads a
// quantity/unit from a fixed leading/trailing position, for the
// DISPLAY name/quantity/unit fields). This is deliberately more
// aggressive and used ONLY for merge identity: "חלב 500 מ״ל" is not a
// shape parseQuantity.ts recognizes (product name, then quantity,
// then unit - see parseQuantity.ts's own doc comment on the patterns
// it supports), but it must still reduce to the same identity as
// "חלב" for grouping purposes.
//
// Falls back to the untouched, whitespace-normalized name if every
// token would be stripped (a mergeKey must never be empty) - a name
// that's somehow nothing but quantity tokens has nothing else to
// identify it by.
export function computeMergeKey(name: string): string {
  const collapsed = name.trim().replace(/\s+/g, ' ');
  if (!collapsed) return collapsed;

  const tokens = collapsed.split(' ');
  const kept = tokens.filter((token) => !isSizeToken(token));
  const key = kept.length > 0 ? kept.join(' ') : collapsed;

  return key.toLowerCase();
}

function tokenCount(name: string): number {
  return name.trim().split(/\s+/).filter(Boolean).length;
}

// Which of two names carries more information worth showing the user
// after a merge - "never lose useful information" (e.g. an existing
// plain "חלב" merging with an incoming "חלב 3%" should end up showing
// "חלב 3%", not silently drop the fat-content detail). Generic, not
// product-specific: more words wins; a tie in word count falls back to
// the longer string; a true tie keeps `existingName`, so an unchanged
// name never triggers a spurious rename.
export function chooseRicherName(existingName: string, candidateName: string): string {
  const existingTokens = tokenCount(existingName);
  const candidateTokens = tokenCount(candidateName);
  if (candidateTokens > existingTokens) return candidateName;
  if (candidateTokens < existingTokens) return existingName;
  return candidateName.length > existingName.length ? candidateName : existingName;
}
