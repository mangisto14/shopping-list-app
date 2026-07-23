// src/components/shopping/FloatingAddButton.tsx
import { useState } from 'react';

interface FloatingAddButtonProps {
  onClick: () => void;
}

const PULSE_MS = 500;

export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  const [pulsing, setPulsing] = useState(false);

  const handleClick = () => {
    onClick();
    setPulsing(true);
    window.setTimeout(() => setPulsing(false), PULSE_MS);
  };

  return (
    <button
      onClick={handleClick}
      aria-label="add item"
      // Sits low enough to overlap ~46px down into BottomNav's own h-16
      // row (see that component's center spacer column), leaving only
      // ~12px of the button poking up above the bar - reads as part of
      // the nav bar rather than a separate floating overlay.
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[58px] h-[58px] rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-[0_0_0_8px_rgba(147,51,234,0.12),0_10px_24px_rgba(147,51,234,0.4),0_2px_6px_rgba(147,51,234,0.3)] active:scale-95 transition-transform duration-150 flex items-center justify-center text-3xl font-light"
    >
      {pulsing && (
        <span className="absolute inset-0 rounded-full bg-purple-400 opacity-75 animate-[ping_500ms_ease-out_1]" aria-hidden="true" />
      )}
      <span className="relative">+</span>
    </button>
  );
}
