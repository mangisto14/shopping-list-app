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
        className="w-full flex items-center justify-between gap-2 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 transition-all hover:shadow-md active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800 min-w-0">
          <span className="text-xl flex-shrink-0">{activeList?.emoji ?? '📋'}</span>
          <span className="truncate">{activeList?.name ?? '...'}</span>
        </span>
        <span className="flex-shrink-0 text-gray-400 text-sm">⌄</span>
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
