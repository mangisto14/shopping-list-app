// src/theme/spacing.ts
// Shared spacing scale. Values match the app's existing Tailwind usage
// (default theme: 1 unit = 4px) - this names the scale rather than
// introducing new pixel values.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
} as const;

export type SpacingToken = keyof typeof SPACING;

// Tailwind padding class per token, for components that take a
// `padding` prop instead of a raw className (e.g. AppCard).
export const PADDING_CLASS: Record<SpacingToken, string> = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-3',
  base: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

// Tailwind gap class per token, for flex/grid layouts.
export const GAP_CLASS: Record<SpacingToken, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  base: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};
