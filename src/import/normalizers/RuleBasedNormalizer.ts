// src/import/normalizers/RuleBasedNormalizer.ts
// Phase 1's only Normalizer implementation. Deliberately NOT AI-backed
// - no network call, no vendor SDK, nothing here even hints at which
// AI provider a future implementation might use. It satisfies the
// same `Normalizer` interface a real AI-backed normalizer will later
// satisfy (see types.ts's Normalizer doc comment) - swapping one in is
// a registration change, not an ImportService change.
//
// Heuristics are intentionally simple: this only has to get the user
// to a reasonable starting point, since every field is editable in
// ImportPreview before anything is committed. A wrong guess here is a
// minor edit, never a silent data error.
import type { ExtractedContent, ImportPipelineContext, Normalizer, NormalizedItemCandidate } from '../types';

// Leading "2x milk" / "2 X milk" style multiplier.
const MULTIPLIER_RE = /^(\d+)\s*[x×]\s*(.+)$/i;
// Leading "500 גרם milk" / "2 kg milk" style quantity+unit. No `\b`
// after the unit alternation - `\b` is defined in terms of `\w`, which
// (in a plain, non-Unicode-mode JS regex) only covers ASCII word
// characters, so it never matches at a Hebrew-letter/space boundary.
// `\.?\s+` already prevents a false partial match (e.g. "גרםx") by
// requiring real whitespace right after the unit.
const QUANTITY_UNIT_RE =
  /^(\d+(?:\.\d+)?)\s*(ק"ג|קג|גרם|גר'|מ"ל|מל|ליטר|יח'|יחידות|kg|g|gram|grams|ml|l|liter|liters|pcs|pc)\.?\s+(.+)$/i;
// Splits trailing free-form notes off the main text, e.g.
// "milk - get the low-fat one" -> name "milk", notes "get the low-fat one".
const NOTES_SPLIT_RE = /\s+(?:-|\/\/)\s+(.+)$/;

function parseLine(rawLine: string): { name: string; quantity: number; unit: string | null; notes: string | null } {
  let line = rawLine.trim();
  let notes: string | null = null;

  const notesMatch = line.match(NOTES_SPLIT_RE);
  if (notesMatch) {
    notes = notesMatch[1].trim() || null;
    line = line.slice(0, notesMatch.index).trim();
  }

  const multiplierMatch = line.match(MULTIPLIER_RE);
  if (multiplierMatch) {
    return { name: multiplierMatch[2].trim(), quantity: Number(multiplierMatch[1]), unit: null, notes };
  }

  const quantityUnitMatch = line.match(QUANTITY_UNIT_RE);
  if (quantityUnitMatch) {
    return {
      name: quantityUnitMatch[3].trim(),
      quantity: Number(quantityUnitMatch[1]),
      unit: quantityUnitMatch[2],
      notes,
    };
  }

  return { name: line, quantity: 1, unit: null, notes };
}

function guessCategory(
  name: string,
  existingCategories: ImportPipelineContext['existingCategories']
): NormalizedItemCandidate['categoryGuess'] {
  const lowerName = name.toLowerCase();
  const match = existingCategories.find((c) => lowerName.includes(c.name.toLowerCase()));
  if (!match) return null;
  return { id: match.id, name: match.name, confidence: 0.5 };
}

// CSV/Excel rows aren't exercised in Phase 1 (CsvExtractor/
// ExcelExtractor are stubs that never produce a `{ kind: 'rows' }`
// result yet), but this is implemented now for architectural
// completeness and unit-testability: first row is treated as a header
// only if it doesn't look like data (no leading digit in column 0);
// recognized header names map to fields, otherwise column order is
// assumed to be [name, quantity, unit, category, notes].
function candidatesFromRows(rows: string[][], context: ImportPipelineContext): NormalizedItemCandidate[] {
  if (rows.length === 0) return [];

  const headerCandidates = ['name', 'quantity', 'unit', 'category', 'notes'];
  const firstRow = rows[0].map((cell) => cell.trim().toLowerCase());
  const looksLikeHeader = firstRow.some((cell) => headerCandidates.includes(cell));
  const header = looksLikeHeader ? firstRow : headerCandidates;
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;

  const indexOf = (field: string) => header.indexOf(field);

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const nameIdx = indexOf('name') >= 0 ? indexOf('name') : 0;
      const quantityIdx = indexOf('quantity');
      const unitIdx = indexOf('unit');
      const categoryIdx = indexOf('category');
      const notesIdx = indexOf('notes');

      const name = (row[nameIdx] ?? '').trim();
      const quantityRaw = quantityIdx >= 0 ? Number(row[quantityIdx]) : NaN;
      const categoryText = categoryIdx >= 0 ? (row[categoryIdx] ?? '').trim() : '';
      const categoryMatch = categoryText
        ? context.existingCategories.find((c) => c.name.toLowerCase() === categoryText.toLowerCase())
        : undefined;

      return {
        id: crypto.randomUUID(),
        rawText: row.join(', '),
        name,
        quantity: Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1,
        unit: unitIdx >= 0 ? row[unitIdx]?.trim() || null : null,
        categoryGuess: categoryMatch ? { id: categoryMatch.id, name: categoryMatch.name, confidence: 0.9 } : null,
        notes: notesIdx >= 0 ? row[notesIdx]?.trim() || null : null,
      };
    })
    .filter((candidate) => candidate.name.length > 0);
}

export const ruleBasedNormalizer: Normalizer = {
  id: 'rule-based',
  async normalize(content: ExtractedContent, context: ImportPipelineContext): Promise<NormalizedItemCandidate[]> {
    if (content.kind === 'rows') {
      return candidatesFromRows(content.rows ?? [], context);
    }

    return (content.lines ?? [])
      .map((rawLine) => {
        const parsed = parseLine(rawLine);
        if (!parsed.name) return null;
        const candidate: NormalizedItemCandidate = {
          id: crypto.randomUUID(),
          rawText: rawLine,
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          categoryGuess: guessCategory(parsed.name, context.existingCategories),
          notes: parsed.notes,
        };
        return candidate;
      })
      .filter((candidate): candidate is NormalizedItemCandidate => candidate !== null);
  },
};
