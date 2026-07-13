// src/components/shopping/InviteMemberButton.tsx
interface InviteMemberButtonProps {
  onClick: () => void;
  // 'solid' reads correctly on ShoppingHeader's colored gradient;
  // 'ghost' reads correctly on MembersPanel's white card. One fixed
  // style wouldn't work in both places this button is required to
  // appear.
  variant?: 'solid' | 'ghost';
}

export default function InviteMemberButton({ onClick, variant = 'solid' }: InviteMemberButtonProps) {
  const styles =
    variant === 'solid'
      ? 'bg-white/20 backdrop-blur text-white border border-white/30 hover:bg-white/30'
      : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${styles}`}
    >
      <span>➕</span>
      הזמן חבר
    </button>
  );
}
