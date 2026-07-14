// src/components/ui/SectionHeader.tsx
import { memo } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Replaces the repeated `<h2 className="text-base font-bold ...">`
// section titles in Dashboard ("קטגוריות", "עוד לקנות") and Statistics
// ("פילוח לפי קטגוריה"). Action button is optional and unused today -
// forward-looking per spec, not wired to any new behavior.
function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2 px-1 gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-gray-800 truncate">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex-shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default memo(SectionHeader);
