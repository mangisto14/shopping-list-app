// src/components/shopping/InviteMemberModal.tsx
import { useEffect, useState } from 'react';
import InviteLinkCard from './InviteLinkCard';
import InviteByEmailForm from './InviteByEmailForm';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InviteMemberModal({ open, onClose }: InviteMemberModalProps) {
  // Drives the entrance transition: mount first at opacity/translate 0,
  // then flip to the visible state a frame later so the CSS transition
  // actually has two distinct states to animate between. No animation
  // library is installed in this project - this is plain Tailwind core
  // utilities (opacity, translate, transition) plus this small timing
  // trick, not a plugin-dependent "animate-in" class.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-md p-5 space-y-4 transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-800">הזמן בני משפחה או שותפים לדירה</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <InviteLinkCard />

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">או</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <InviteByEmailForm />

        {/* TODO (Future): connect to list_members - once a real invite
            is accepted, insert a list_members row for the invited
            user (see useLists.ts's createList for the existing
            insert pattern this would follow).
            TODO (Future): accept invite flow - a route like
            /invite/:code that looks up the invite, and if the visitor
            is signed in (or after they sign up/in), adds them to the
            list. Nothing here today resolves the mock URL/code to
            anything. */}
      </div>
    </div>
  );
}
