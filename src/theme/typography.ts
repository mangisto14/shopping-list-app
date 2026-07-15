// src/theme/typography.ts
// Named type scale, matching the Claude Design's Heebo scale: 28/800
// page title, 20/700 section title, 16.5/600 item name, 13/500 body,
// 11.5/700 tag/caption.
export const TYPOGRAPHY = {
  caption: 'text-xs text-gray-500',
  body: 'text-[13px] font-medium text-gray-500',
  subtitle: 'text-lg font-bold text-gray-900',
  title: 'text-[28px] font-extrabold text-gray-900 tracking-tight',
  hero: 'text-[28px] font-extrabold text-gray-900 tracking-tight',
} as const;

export type TypographyToken = keyof typeof TYPOGRAPHY;
