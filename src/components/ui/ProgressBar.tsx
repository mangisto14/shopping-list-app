// src/components/ui/ProgressBar.tsx
import { memo } from 'react';
import { BRAND, SEMANTIC } from '../../theme/colors';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  height?: 'sm' | 'md';
  colorClassName?: string;
  trackClassName?: string;
}

const HEIGHT_CLASS: Record<NonNullable<ProgressBarProps['height']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

// Single progress bar used by ShoppingList's own ProgressBar, Dashboard
// (header bar + per-category tile bars), and Statistics (overall bar +
// per-category breakdown bars) - previously 5 near-identical
// implementations. `label` is optional: when provided it renders a
// text/percentage row above the bar; callers with their own custom
// header row (e.g. category name + done/total) just render the bar.
function ProgressBar({
  percentage,
  label,
  height = 'md',
  colorClassName = BRAND.gradient,
  trackClassName = SEMANTIC.neutral.track,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-sm font-medium text-gray-600 mb-2">
          <span>{label}</span>
          <span className={`font-bold ${BRAND.text}`}>{clamped}%</span>
        </div>
      )}
      <div className={`w-full ${HEIGHT_CLASS[height]} ${trackClassName} rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${colorClassName} transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default memo(ProgressBar);
