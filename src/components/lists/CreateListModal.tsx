// src/components/lists/CreateListModal.tsx
import { useEffect, useState, type FormEvent } from 'react';

const EMOJI_OPTIONS = ['🏠', '🛒', '🛋️', '🚗', '🎉', '✈️', '🏡', '🍔', '💼', '🎓'];

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateListModal({ open, onClose }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [created, setCreated] = useState(false);
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // TODO (Future): create a real list - call useActiveList()'s
    // createList(name) (already implemented in useLists.ts) instead of
    // this timeout. The chosen emoji has nowhere to persist yet - lists
    // has no emoji column - so it would need either a schema change or
    // a separate client-side mapping until one exists. Mock only for
    // now: nothing is saved, closing this modal loses the input.
    setCreated(true);
    setTimeout(() => {
      setCreated(false);
      setName('');
      setEmoji(EMOJI_OPTIONS[0]);
      onClose();
    }, 1200);
  };

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">רשימה חדשה</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {created ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">✓</p>
            <p className="text-emerald-600 font-medium">הרשימה נוצרה בהצלחה</p>
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

            <button
              type="submit"
              className="w-full bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-600 transition-all active:scale-[0.99]"
            >
              צור רשימה
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
