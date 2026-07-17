// src/components/shopping/InviteByEmailForm.tsx
import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../LanguageContext';
import { friendlyErrorMessage } from '../../utils/friendlyError';

interface InviteByEmailFormProps {
  onInvite: (email: string) => Promise<{ success: boolean; errorCode?: string }>;
}

// Takes onInvite as a prop rather than calling useMembers() itself:
// this form renders inside InviteMemberModal, which is itself rendered
// from pages that already call useMembers() once for their own member
// list. A second independent useMembers() call here would open a
// second Realtime subscription on the same list_members channel name,
// which Supabase's client rejects ("tried to subscribe multiple
// times") - caught via testing, not theoretical.
export default function InviteByEmailForm({ onInvite }: InviteByEmailFormProps) {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;

    setStatus('sending');
    setErrorMessage('');
    const result = await onInvite(email);

    if (!result.success) {
      setStatus('error');
      setErrorMessage(friendlyErrorMessage(result.errorCode, language as 'he' | 'en', 'invite'));
      return;
    }

    setStatus('sent');
    setEmail('');
    setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-sm font-bold text-gray-900">הזמנה באימייל</p>
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          placeholder="name@example.com"
          dir="ltr"
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 disabled:opacity-60 ${
            status === 'sent' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {status === 'sending' ? 'שולח...' : status === 'sent' ? '✓ נוסף/ה לרשימה' : 'הוסף/י'}
        </button>
      </div>
      {status === 'error' && errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
    </form>
  );
}
