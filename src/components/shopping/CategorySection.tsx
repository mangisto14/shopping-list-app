// src/components/shopping/CategorySection.tsx
import type { ReactNode } from 'react';
import { getCategoryStyle } from '../../theme/categoryStyles';
import { useDeveloperConsole } from '../../config/DeveloperConsoleContext';

interface CategorySectionProps {
  categoryName: string | null; // null = uncategorized
  count: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: ReactNode;
}

// Collapsible category group: icon + name + count as a compact, tinted
// header (visually distinct per category), chevron disclosure. Used for
// both active and completed sections - the same grouped structure, per
// the design spec. Item rows themselves are passed as children so this
// component stays purely about the group chrome/collapse behavior.
export default function CategorySection({ categoryName, count, expanded, onToggleExpanded, children }: CategorySectionProps) {
  const style = getCategoryStyle(categoryName);
  const { animations } = useDeveloperConsole();

  return (
    <div>
      <button
        onClick={onToggleExpanded}
        className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${style.bg}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[15px] flex-shrink-0" aria-hidden="true">
            {style.icon}
          </span>
          <span className={`text-[13px] font-bold truncate ${style.text}`}>{categoryName ?? 'ללא קטגוריה'}</span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[12px] font-semibold ${style.text} opacity-70`}>{count}</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`flex-shrink-0 ${style.text} transition-transform duration-150`}
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* CSS grid-rows expand/collapse: animates smoothly without
          measuring scrollHeight in JS. Children stay mounted while
          collapsed (0fr row + overflow-hidden hides them) rather than
          unmounting - trades a little always-in-DOM cost (fine at this
          app's 100-item/20-category scale) for an animatable height. */}
      <div
        className="grid transition-[grid-template-rows] ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr', transitionDuration: `${animations.listItemAnimationDuration}ms` }}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
