// src/components/categories/CategoryAddTile.tsx
interface CategoryAddTileProps {
  label: string;
  onClick: () => void;
}

// Dashed "add new category" tile spanning the full grid width, matching
// the Claude Design's Categories screen.
export default function CategoryAddTile({ label, onClick }: CategoryAddTileProps) {
  return (
    <button
      onClick={onClick}
      className="col-span-2 border-2 border-dashed border-gray-300 rounded-[18px] min-h-[58px] flex items-center justify-center gap-2 text-gray-500 text-[15px] font-semibold bg-white/50 hover:bg-white transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
