// src/import/sources/metadata.ts
// Single source of truth for "every provider the UI can show" -
// ImportSheet renders this list directly rather than hardcoding its
// own, so a new source is visible in the UI the moment it's added
// here, marked Coming Soon until its isAvailable() returns true.
import type { ImportSourceMeta } from '../types';

export const IMPORT_SOURCE_METADATA: ImportSourceMeta[] = [
  { id: 'paste-text', labelHe: 'הדבקת טקסט', labelEn: 'Paste Text', icon: '📋' },
  { id: 'camera', labelHe: 'מצלמה', labelEn: 'Camera', icon: '📷' },
  { id: 'gallery', labelHe: 'גלריה', labelEn: 'Gallery', icon: '🖼️' },
  { id: 'image', labelHe: 'תמונה', labelEn: 'Image', icon: '🖼️' },
  { id: 'csv', labelHe: 'קובץ CSV', labelEn: 'CSV', icon: '📄' },
  { id: 'excel', labelHe: 'קובץ Excel', labelEn: 'Excel', icon: '📊' },
  { id: 'apple-reminders', labelHe: 'Apple Reminders', labelEn: 'Apple Reminders', icon: '✅' },
  { id: 'google-keep', labelHe: 'Google Keep', labelEn: 'Google Keep', icon: '📝' },
];
