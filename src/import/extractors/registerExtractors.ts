// src/import/extractors/registerExtractors.ts
// The single place that lists every registered Extractor. Order
// matters only in that ImportService picks the first one whose
// accepts() returns true - kept deliberately unambiguous per-extractor
// (see each file's accepts()) so order isn't actually load-bearing
// today, but plain-text is listed first since it's the one real path.
import type { Extractor } from '../types';
import { plainTextExtractor } from './PlainTextExtractor';
import { ocrExtractor } from './OcrExtractor';
import { csvExtractor } from './CsvExtractor';
import { excelExtractor } from './ExcelExtractor';
import { appleRemindersExtractor } from './AppleRemindersExtractor';
import { googleKeepExtractor } from './GoogleKeepExtractor';

export const ALL_EXTRACTORS: Extractor[] = [
  plainTextExtractor,
  ocrExtractor,
  csvExtractor,
  excelExtractor,
  appleRemindersExtractor,
  googleKeepExtractor,
];
