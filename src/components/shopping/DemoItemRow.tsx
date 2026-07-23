// src/components/shopping/DemoItemRow.tsx
import { useEffect, useState } from 'react';

interface DemoItemRowProps {
  label: string;
  onFinished: () => void;
}

// Purely decorative, non-interactive row shown once when the shopping
// list is empty, teaching the swipe-to-delete gesture before falling
// back to the real empty state. Deliberately independent of ItemCard -
// its own constants and markup, not imported from or coupled to it -
// so the two can change separately without one breaking the other.
const ENTRY_DELAY_MS = 400;
const ENTRY_DISTANCE_PX = 18;
const ENTRY_HOLD_MS = 250;
const ENTRY_TRANSITION_MS = 300;
const FADE_MS = 300;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function DemoItemRow({ label, onFinished }: DemoItemRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const finish = () => {
      setVisible(false);
      window.setTimeout(onFinished, FADE_MS);
    };

    if (prefersReducedMotion()) {
      const timer = window.setTimeout(finish, ENTRY_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    const delayTimer = window.setTimeout(() => {
      setTranslateX(ENTRY_DISTANCE_PX);
      const holdTimer = window.setTimeout(() => {
        setTranslateX(0);
        window.setTimeout(finish, ENTRY_TRANSITION_MS);
      }, ENTRY_HOLD_MS);
      return () => window.clearTimeout(holdTimer);
    }, ENTRY_DELAY_MS);

    return () => window.clearTimeout(delayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealProgress = Math.min(1, translateX / (ENTRY_DISTANCE_PX * 2));

  return (
    <div
      aria-hidden="true"
      className="relative transition-opacity ease-in-out"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="absolute inset-y-0 left-0 flex items-center justify-center rounded-xl bg-red-500" style={{ width: 220 }}>
        <div className="flex flex-col items-center gap-0.5 text-white px-4" style={{ opacity: revealProgress }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M2.5 5h13M6.5 5V3.5A1.5 1.5 0 018 2h2a1.5 1.5 0 011.5 1.5V5M4.5 5l1 10.5A1.5 1.5 0 007 17h4a1.5 1.5 0 001.5-1.5L13.5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] font-bold">מחיקה</span>
        </div>
      </div>

      <div
        style={{ transform: `translateX(${translateX}px)`, transition: `transform ${ENTRY_TRANSITION_MS}ms ease-out` }}
        className="relative flex items-center gap-2.5 overflow-hidden bg-white rounded-xl px-3 py-2 min-h-[52px] border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_10px_rgba(15,23,42,0.05)]"
      >
        <span className="absolute inset-y-0 left-0 w-[2px] bg-red-500" aria-hidden="true" />
        <span className="flex-shrink-0 w-1 self-stretch rounded-full bg-gray-200" aria-hidden="true" />
        <span className="flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-gray-300" />
        <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-gray-400">{label}</span>
        <span className="flex-shrink-0 text-[12px] font-medium text-gray-400">1x</span>
      </div>
    </div>
  );
}
