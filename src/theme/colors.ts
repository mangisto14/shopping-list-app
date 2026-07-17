// src/theme/colors.ts
// Named references for the color classes used across the app. Matches
// the Claude Design source of truth: blue primary (#2563EB = Tailwind
// blue-600), green success (#22C55E = green-500), amber warning, red
// danger, slate/gray neutrals. Centralizes the strings so shared
// components don't each hardcode their own copy.

export const BRAND = {
  gradient: 'bg-gradient-to-br from-blue-600 to-blue-700',
  gradientDiagonal: 'bg-gradient-to-br from-blue-600 to-blue-700',
  solid: 'bg-blue-600',
  text: 'text-blue-600',
  bg: 'bg-blue-50',
  bgSolid: 'bg-blue-600',
  ring: 'focus:ring-blue-400',
} as const;

export const SEMANTIC = {
  success: { text: 'text-green-600', bg: 'bg-green-50', solid: 'bg-green-500' },
  warning: { text: 'text-amber-600', bg: 'bg-amber-50', solid: 'bg-amber-500' },
  danger: { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  neutral: { text: 'text-gray-500', bg: 'bg-gray-50', track: 'bg-gray-100' },
} as const;

export const SURFACE = {
  card: 'bg-white',
  background: 'bg-slate-50',
  border: 'border-gray-100',
  shadow: 'shadow-sm',
  shadowElevated: 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]',
} as const;
