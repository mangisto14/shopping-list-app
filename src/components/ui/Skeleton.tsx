// src/components/ui/Skeleton.tsx
import { memo } from 'react';

interface SkeletonProps {
  className?: string;
}

// Single pulsing placeholder block, composed into page-level skeleton
// screens below. Using this instead of a blank screen or an
// immediately-flashed-then-corrected empty state while the initial
// list/items/categories fetch is in flight.
function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

// Matches the shape of the main shopping list / dashboard / statistics
// pages: a header card, a progress bar, and a few list rows.
export function PageSkeleton() {
  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 space-y-4" aria-busy="true" aria-label="loading">
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export default memo(Skeleton);
