// src/components/ui/EmptyState.tsx
import { memo } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: 'sm' | 'lg';
  // 'dashed' matches the Claude Design's empty-state treatment (Family/
  // Categories screens): dashed border, tinted icon circle, transparent-
  // ish card instead of a solid white shadowed one.
  variant?: 'solid' | 'dashed';
}

// Replaces the ~5 near-identical empty/loading boxes across
// EmptyListsState, Dashboard ("🎉 הכל נקנה"), Statistics ("אין נתונים
// להצגה"), FamilyMembers ("אין חברים"/loading), and ShoppingList's
// empty-list box.
function EmptyState({ icon, title, description, actionLabel, onAction, size = 'sm', variant = 'solid' }: EmptyStateProps) {
  const iconSize = size === 'lg' ? 'text-5xl mb-3' : 'text-3xl mb-2';
  const padding = size === 'lg' ? 'p-8' : 'p-6';

  if (variant === 'dashed') {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-[18px] p-[18px] flex flex-col items-center gap-2 text-center bg-white/50">
        <span className="w-[52px] h-[52px] rounded-full bg-blue-50 flex items-center justify-center text-2xl">{icon}</span>
        <p className="text-[15px] font-bold text-gray-900">{title}</p>
        {description && <p className="text-[13px] font-medium text-gray-500 max-w-[240px]">{description}</p>}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 mt-2"
          >
            <span>➕</span>
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm ${padding} text-center`}>
      <p className={iconSize}>{icon}</p>
      <p className="text-gray-500 font-medium text-sm">{title}</p>
      {description && <p className="text-gray-400 text-xs mt-1">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95 mt-4"
        >
          <span>➕</span>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default memo(EmptyState);
