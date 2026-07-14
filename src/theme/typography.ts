// src/theme/typography.ts
// Named type scale. Maps each named level to the Tailwind text/weight
// classes already used for that role across the app (page titles,
// card titles, body text, captions) - a label for existing sizes, not
// new ones.
export const TYPOGRAPHY = {
  caption: 'text-xs text-gray-400',
  body: 'text-sm text-gray-700',
  subtitle: 'text-sm font-semibold text-gray-700',
  title: 'text-lg font-bold text-gray-800',
  hero: 'text-2xl font-bold text-gray-800',
} as const;

export type TypographyToken = keyof typeof TYPOGRAPHY;
