// src/theme/colors.ts
// Named references for the color classes already established across
// the app (violet/purple brand accent, emerald for success/done,
// gray neutrals). Centralizes the strings so shared components don't
// each hardcode their own copy - does not introduce any new palette.

export const BRAND = {
  gradient: 'bg-gradient-to-r from-violet-500 to-purple-500',
  gradientDiagonal: 'bg-gradient-to-br from-violet-500 to-purple-600',
  text: 'text-violet-600',
  bg: 'bg-violet-50',
  bgSolid: 'bg-violet-500',
  ring: 'focus:ring-violet-400',
} as const;

export const SEMANTIC = {
  success: { text: 'text-emerald-600', bg: 'bg-emerald-50', solid: 'bg-emerald-500' },
  danger: { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  neutral: { text: 'text-gray-500', bg: 'bg-gray-50', track: 'bg-gray-100' },
} as const;

export const SURFACE = {
  card: 'bg-white',
  border: 'border-gray-100',
  shadow: 'shadow-sm',
} as const;
