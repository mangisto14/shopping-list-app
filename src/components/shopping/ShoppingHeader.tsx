// src/components/shopping/ShoppingHeader.tsx
interface ShoppingHeaderProps {
  title: string;
  subtitle: string;
  totalItems: number;
  completedItems: number;
  itemsLabel: string;
  completedLabel: string;
}

// TODO: replace with real household members, sourced from list_members
// (plus display name/avatar once a profiles table exists) once
// realtime presence for collaborators is implemented. Same limitation
// already flagged on the Lists page's member panel - mock data only,
// not wired to any query.
const MOCK_MEMBERS = ['👨', '👩', '👧'];

export default function ShoppingHeader({
  title,
  subtitle,
  totalItems,
  completedItems,
  itemsLabel,
  completedLabel,
}: ShoppingHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-md p-5">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-white/80 mt-0.5">{subtitle}</p>

      <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
        <div className="flex gap-2">
          <span className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm font-medium">
            {totalItems} {itemsLabel}
          </span>
          <span className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm font-medium">
            {completedItems} {completedLabel}
          </span>
        </div>

        <div className="flex gap-1">
          {MOCK_MEMBERS.map((avatar, i) => (
            <span
              key={i}
              className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-base"
            >
              {avatar}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
