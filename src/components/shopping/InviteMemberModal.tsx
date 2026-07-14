// src/components/shopping/InviteMemberModal.tsx
import InviteLinkCard from './InviteLinkCard';
import InviteByEmailForm from './InviteByEmailForm';
import BottomSheet from '../ui/BottomSheet';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<{ success: boolean; errorCode?: string }>;
}

export default function InviteMemberModal({ open, onClose, onInvite }: InviteMemberModalProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="הזמן בני משפחה או שותפים לדירה">
      <InviteLinkCard />

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">או</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <InviteByEmailForm onInvite={onInvite} />
    </BottomSheet>
  );
}
