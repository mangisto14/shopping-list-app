// src/components/lists/EmptyListsState.tsx
import EmptyState from '../ui/EmptyState';

interface EmptyListsStateProps {
  onCreateFirst: () => void;
}

export default function EmptyListsState({ onCreateFirst }: EmptyListsStateProps) {
  return (
    <EmptyState
      icon="🛍️"
      title="אין עדיין רשימות"
      actionLabel="צור רשימה ראשונה"
      onAction={onCreateFirst}
      size="lg"
    />
  );
}
