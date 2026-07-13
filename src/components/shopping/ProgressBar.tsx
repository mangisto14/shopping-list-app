// src/components/shopping/ProgressBar.tsx
interface ProgressBarProps {
  totalItems: number;
  completedItems: number;
  label: string;
}

export default function ProgressBar({ totalItems, completedItems, label }: ProgressBarProps) {
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2 text-sm font-medium text-gray-600">
        <span>
          {completedItems} / {totalItems} {label}
        </span>
        <span className="font-semibold text-gray-800">{percentage}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
