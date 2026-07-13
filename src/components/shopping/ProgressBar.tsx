// src/components/shopping/ProgressBar.tsx
interface ProgressBarProps {
  totalItems: number;
  completedItems: number;
  label: string;
  remainingLabel: string;
}

export default function ProgressBar({ totalItems, completedItems, label, remainingLabel }: ProgressBarProps) {
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const remaining = totalItems - completedItems;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2.5 text-sm font-medium text-gray-500">
        <span>
          {remaining} {remainingLabel}
        </span>
        <span className="font-semibold text-violet-600">
          {percentage}% {label}
        </span>
      </div>
    </div>
  );
}
