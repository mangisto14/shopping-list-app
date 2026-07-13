// src/components/shopping/InviteByEmailForm.tsx
import { useState, type FormEvent } from 'react';

export interface Invitation {
  email: string;
  status: 'pending' | 'accepted';
}

export default function InviteByEmailForm() {
  const [email, setEmail] = useState('');
  const [lastInvitation, setLastInvitation] = useState<Invitation | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // TODO (Future): send a real invitation - e.g. a Supabase Edge
    // Function that creates a pending row (list_id, email, status) and
    // emails a signed accept-invite link (see InviteMemberModal's
    // TODO for the accept-flow side). Mock only for now: no request is
    // made, nothing is persisted - lastInvitation resets on a timer and
    // is gone entirely if this form unmounts (e.g. the modal closes).
    setLastInvitation({ email: email.trim(), status: 'pending' });
    setEmail('');
    setTimeout(() => setLastInvitation(null), 2500);
  };

  const sent = lastInvitation !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">הזמנה באימייל</p>
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          dir="ltr"
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
            sent ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {sent ? '✓ הזמנה נשלחה' : 'שלח הזמנה'}
        </button>
      </div>
      {sent && lastInvitation && (
        <p className="text-xs text-emerald-600">נשלח ל-{lastInvitation.email}</p>
      )}
    </form>
  );
}
