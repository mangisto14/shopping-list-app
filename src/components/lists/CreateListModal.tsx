// src/components/lists/CreateListModal.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useActiveList } from '../../ActiveListContext';
import BottomSheet from '../ui/BottomSheet';

const EMOJI_OPTIONS = ['🏠', '🛒', '🛋️', '🚗', '🎉', '✈️', '🏡', '🍔', '💼', '🎓'];

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateListModal({ open, onClose }: CreateListModalProps) {
  const { createList } = useActiveList();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCreated(false);
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  // Calls the real createList (useLists.ts, already used by Lists.tsx)
  // instead of the previous fake setTimeout success flow - nothing was
  // ever saved before. The chosen emoji still can't persist: `lists`
  // has no emoji column, and adding one is a schema change (out of
  // scope this phase) - the picker stays as a same-session-only choice,
  // same documented gap as before, not made worse.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    const result = await createList(name.trim());
    setSubmitting(false);

    if (!result) {
      setError('שגיאה ביצירת הרשימה. נסה שוב.');
      return;
    }

    setCreated(true);
    setTimeout(() => {
      setCreated(false);
      setName('');
      setEmoji(EMOJI_OPTIONS[0]);
      onClose();
    }, 1200);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="רשימה חדשה">
      {created ? (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">✓</p>
          <p className="text-green-600 font-medium">הרשימה נוצרה בהצלחה</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">שם הרשימה</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: קניות שבועיות"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">בחר אייקון</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setEmoji(option)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                    emoji === option ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-600 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? 'יוצר...' : 'צור רשימה'}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
