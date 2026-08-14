// src/components/shopping/InviteMemberModal.tsx
import InviteLinkCard from './InviteLinkCard';
import InviteByEmailForm from './InviteByEmailForm';
import BottomSheet from '../ui/BottomSheet';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<{ success: boolean; errorCode?: string }>;
  // Required (no default) rather than optional-with-a-permissive-default:
  // only the list owner may invite (invite_member_by_email raises
  // not_owner server-side for anyone else), so every caller must state
  // this explicitly rather than risk silently showing the form to a
  // non-owner if a future call site forgets to pass it.
  isOwner: boolean;
}

export default function InviteMemberModal({ open, onClose, onInvite, isOwner }: InviteMemberModalProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="הזמנת בני משפחה או שותפים לדירה">
      <InviteLinkCard />

      {isOwner && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">או</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <InviteByEmailForm onInvite={onInvite} />
        </>
      )}
    </BottomSheet>
  );
}
