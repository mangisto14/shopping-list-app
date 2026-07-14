// src/components/ui/AppCard.tsx
import { memo, type ReactNode } from 'react';
import { PADDING_CLASS, type SpacingToken } from '../../theme/spacing';

interface AppCardProps {
  children: ReactNode;
  padding?: SpacingToken;
  rounded?: 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
}

// Replaces the `bg-white rounded-xl/2xl shadow-sm p-*` shell repeated
// across Dashboard/Statistics/FamilyMembers/ShoppingList and their
// sub-panels (ProgressBar, MembersPanel, PresencePanel, item rows,
// etc). Pure presentational wrapper - memoized since its output only
// ever depends on its own props.
function AppCard({ children, padding = 'base', rounded = '2xl', className = '', onClick }: AppCardProps) {
  const roundedClass = rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl';
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`w-full bg-white ${roundedClass} shadow-sm ${PADDING_CLASS[padding]} ${className}`}
    >
      {children}
    </Tag>
  );
}

export default memo(AppCard);
