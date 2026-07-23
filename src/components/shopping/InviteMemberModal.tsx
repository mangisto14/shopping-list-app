// src/components/shopping/InviteMemberModal.tsx
import InviteLinkCard from './InviteLinkCard';
import InviteByEmailForm from './InviteByEmailForm';
import BottomSheet from '../ui/BottomSheet';
import { useDevTools } from '../../devtools';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<{ success: boolean; errorCode?: string }>;
}

export default function InviteMemberModal({ open, onClose, onInvite }: InviteMemberModalProps) {
  // Dev/QA feature flag, defaults to true (today's shipped behavior
  // unchanged) - see src/devtools/FeatureFlags/store.ts. Never disabled
  // by this code itself; only a developer flipping it in the Developer
  // Console can turn email invite off.
  const { featureFlags } = useDevTools();

  return (
    <BottomSheet open={open} onClose={onClose} title="הזמנת בני משפחה או שותפים לדירה">
      <InviteLinkCard />

      {featureFlags.enableEmailInvite && (
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
