// src/components/history/HistorySessionCard.tsx
interface HistoryItem {
  id: string;
  name: string;
  is_done: boolean;
}

interface HistorySessionCardProps {
  date: string;
  items: HistoryItem[];
  dotColorClassName?: string;
}

// One row of the History timeline, matching the Claude Design's
// dot-and-line layout. No cost/completed-by fields exist in the
// `history` table's current query (see docs/design-mapping.md §5), so
// this shows date + item count + an item-name preview instead of
// fabricating numbers the data doesn't back up.
export default function HistorySessionCard({ date, items, dotColorClassName = 'border-blue-600' }: HistorySessionCardProps) {
  const preview = items.map((i) => i.name).join(' · ');

  return (
    <div className="flex gap-3.5 items-start">
      <div className="w-9 flex justify-center pt-[18px] flex-shrink-0">
        <span className={`w-3.5 h-3.5 rounded-full bg-white border-[3.5px] ${dotColorClassName} shadow-[0_0_0_3px_#F8FAFC]`} />
      </div>
      <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.05)] px-4 py-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15.5px] font-bold text-gray-900">{date}</span>
          <span className="text-[12px] font-semibold text-green-600 bg-green-50 rounded-full px-2.5 py-0.5 flex-shrink-0">
            {items.length} פריטים
          </span>
        </div>
        {preview && <p className="text-[12.5px] font-medium text-gray-500 truncate">{preview}</p>}
      </div>
    </div>
  );
}
