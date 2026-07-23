// src/components/lists/ListSwitcher.tsx
import { useState } from 'react';
import type { ListInfo } from './ListCard';
import ListSelectorModal from './ListSelectorModal';

interface ListSwitcherProps {
  lists: ListInfo[];
  activeList: ListInfo | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export default function ListSwitcher({ lists, activeList, onSelect, onCreateNew }: ListSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_2px_6px_rgba(15,23,42,0.04)] text-gray-600 hover:text-gray-800 transition-all active:scale-[0.98]"
      >
        <span className="flex items-center gap-1 text-[13px] font-medium min-w-0">
          <span className="flex-shrink-0">{activeList?.emoji ?? '📋'}</span>
          <span className="truncate">{activeList?.name ?? '...'}</span>
        </span>
        <span className="flex-shrink-0 text-xs">⌄</span>
      </button>

      <ListSelectorModal
        open={open}
        onClose={() => setOpen(false)}
        lists={lists}
        activeListId={activeList?.id ?? null}
        onSelect={(id) => {
          onSelect(id);
          setOpen(false);
        }}
        onCreateNew={() => {
          setOpen(false);
          onCreateNew();
        }}
      />
    </>
  );
}
