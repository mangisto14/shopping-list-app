// src/import/semantic/parseQuantity.ts
// Recognizes a quantity (and, when present, a unit) at either edge of
// a raw shopping-list line, returning what's left as the product name
// text for KnowledgeMatcher.ts to resolve.
//
// Deliberately NOT one monolithic regex. Two bugs were found (and
// avoided) while designing this:
//   1. A single regex with an optional unit group between two
//      whitespace-consuming pieces (`\s*` before, `\s+` after) can fail
//      to match a leading bare quantity with no unit at all ("3
//      מלפפון") - the first `\s*` greedily consumes the only space,
//      leaving nothing for the later mandatory `\s+`.
//   2. Matching a unit via regex alternation (all synonyms baked into
//      one pattern) risks a short synonym partial-matching as a
//      substring of an unrelated word - e.g. "מל" (מ"ל/milliliter)
//      is a literal prefix of "מלפפון" (cucumber).
// Both are avoided here by splitting the line into whitespace-
// separated tokens and checking a UNIT SYNONYM only as a WHOLE token
// via normalizeUnit() (see knowledge/units.ts), never as a substring.
import { normalizeUnit } from '../knowledge/units';

export interface ParsedQuantity {
  quantity: number;
  quantityFound: boolean;
  unit: string | null;
  // True only when the unit was read directly out of the text itself
  // (not a knowledge-base default guessed from the product name).
  unitFound: boolean;
  remainingText: string;
}

const PURE_NUMBER_RE = /^\d+(?:\.\d+)?$/;
// "3x מלפפון", "3 x מלפפון"
const LEADING_MULTIPLIER_RE = /^(\d+(?:\.\d+)?)\s*[x×]\s*(.+)$/i;
// "מלפפון x3", "מלפפון ×3"
const TRAILING_MULTIPLIER_RE = /^(.+?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i;

function notFound(remainingText: string): ParsedQuantity {
  return { quantity: 1, quantityFound: false, unit: null, unitFound: false, remainingText };
}

export function parseQuantity(rawText: string): ParsedQuantity {
  // Collapsed once, up front, so every exit path below (multiplier
  // regexes, token split/join, and the no-match fallback alike)
  // returns an already whitespace-normalized `remainingText` - never
  // just the edges trimmed while stray internal double-spaces survive.
  const line = rawText.trim().replace(/\s+/g, ' ');
  if (!line) return notFound(line);

  const leadingMultiplier = line.match(LEADING_MULTIPLIER_RE);
  if (leadingMultiplier) {
    return {
      quantity: Number(leadingMultiplier[1]),
      quantityFound: true,
      unit: null,
      unitFound: false,
      remainingText: leadingMultiplier[2].trim(),
    };
  }

  const trailingMultiplier = line.match(TRAILING_MULTIPLIER_RE);
  if (trailingMultiplier) {
    return {
      quantity: Number(trailingMultiplier[2]),
      quantityFound: true,
      unit: null,
      unitFound: false,
      remainingText: trailingMultiplier[1].trim(),
    };
  }

  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return notFound(line);

  // Leading bare quantity, optionally followed by a whole-token unit:
  // "3 מלפפון", "2 יח מלפפון", "500 גרם גבינה", '2 ק"ג תפוחים', "1.5 ליטר חלב"
  if (PURE_NUMBER_RE.test(tokens[0])) {
    const quantity = Number(tokens[0]);
    let rest = tokens.slice(1);
    let unit: string | null = null;
    let unitFound = false;

    if (rest.length >= 2) {
      const normalizedUnit = normalizeUnit(rest[0]);
      if (normalizedUnit) {
        unit = normalizedUnit;
        unitFound = true;
        rest = rest.slice(1);
      }
    }

    return { quantity, quantityFound: true, unit, unitFound, remainingText: rest.join(' ') };
  }

  // Trailing quantity + unit, product name (possibly itself containing
  // a percent/size token like "3%") first: "גבינה צהובה 400 גרם",
  // "חלב 3% 2 ליטר". Checked before the bare-trailing-quantity case
  // below so a genuine unit right after the number is captured rather
  // than left fused into the "remaining name" text. The percent token
  // itself can never be mistaken for this quantity: PURE_NUMBER_RE is
  // anchored end-to-end, so "3%" (with its trailing %) always fails
  // it - only a token that's ENTIRELY digits ever qualifies.
  if (tokens.length >= 3) {
    const maybeUnit = normalizeUnit(tokens[tokens.length - 1]);
    const maybeQuantityToken = tokens[tokens.length - 2];
    if (maybeUnit && PURE_NUMBER_RE.test(maybeQuantityToken)) {
      return {
        quantity: Number(maybeQuantityToken),
        quantityFound: true,
        unit: maybeUnit,
        unitFound: true,
        remainingText: tokens.slice(0, -2).join(' '),
      };
    }
  }

  // Trailing bare quantity, no unit: "מלפפון 3"
  const lastToken = tokens[tokens.length - 1];
  if (tokens.length >= 2 && PURE_NUMBER_RE.test(lastToken)) {
    return {
      quantity: Number(lastToken),
      quantityFound: true,
      unit: null,
      unitFound: false,
      remainingText: tokens.slice(0, -1).join(' '),
    };
  }

  return notFound(line);
}
