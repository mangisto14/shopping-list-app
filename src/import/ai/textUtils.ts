// src/import/ai/textUtils.ts
// Small, pure string-matching helpers shared by the heuristic engine's
// duplicate-detection and category-suggestion logic. No AI, no
// network - plain string algorithms.

export function normalizeForComparison(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function tokenize(text: string): string[] {
  return normalizeForComparison(text)
    .split(/[\s,./\\-]+/)
    .filter((token) => token.length > 0);
}

// Classic Levenshtein edit distance - used to catch near-duplicates
// ("עגבניה" vs "עגבניות") that an exact string match would miss.
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) distances[i][0] = i;
  for (let j = 0; j < cols; j++) distances[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost
      );
    }
  }

  return distances[rows - 1][cols - 1];
}

// A name with no meaningful letters (too short, or only digits/
// punctuation) is ambiguous - there's nothing to reasonably guess a
// category, unit, or duplicate match from.
// ֐-׿ is the full Hebrew Unicode block.
const HEBREW_OR_LATIN_LETTER_RE = /[a-zA-Z֐-׿]/;

export function isAmbiguousName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return true;
  // A name with no Latin or Hebrew letters at all (just digits/
  // punctuation/symbols) isn't a real product name.
  return !HEBREW_OR_LATIN_LETTER_RE.test(trimmed);
}
