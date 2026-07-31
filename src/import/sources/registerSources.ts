// src/import/sources/registerSources.ts
// The single place that lists every registered Source. Imported once
// by ImportService at module load - adding a 9th source later means
// adding one line here, never touching any existing source's file.
import type { ImportSource } from '../types';
import { pasteTextSource } from './PasteTextSource';
import { cameraSource } from './CameraSource';
import { gallerySource } from './GallerySource';
import { imageSource } from './ImageSource';
import { csvSource } from './CsvSource';
import { excelSource } from './ExcelSource';
import { appleRemindersSource } from './AppleRemindersSource';
import { googleKeepSource } from './GoogleKeepSource';

export const ALL_SOURCES: ImportSource[] = [
  pasteTextSource,
  cameraSource,
  gallerySource,
  imageSource,
  csvSource,
  excelSource,
  appleRemindersSource,
  googleKeepSource,
];
