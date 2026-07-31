// src/import/normalizers/registerNormalizers.ts
// ImportService always uses the first registered Normalizer today
// (Phase 1 has exactly one). A future AI-backed normalizer is added
// here, and could become the default by reordering this array or by
// ImportService picking by id - neither requires touching
// RuleBasedNormalizer.ts.
import type { Normalizer } from '../types';
import { ruleBasedNormalizer } from './RuleBasedNormalizer';

export const ALL_NORMALIZERS: Normalizer[] = [ruleBasedNormalizer];
export const DEFAULT_NORMALIZER_ID = ruleBasedNormalizer.id;
