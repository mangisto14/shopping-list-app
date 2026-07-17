// src/components/ui/QuantityStepper.tsx
import { memo } from 'react';

interface QuantityStepperProps {
  quantity: number;
  onChange: (quantity: number) => void;
}

// Shared "+ / N / -" pill used by both QuickAddBar (main list screen)
// and AddItemSheet (bottom sheet) - same control, same semantics: see
// ShoppingList.tsx's addQuantity state for how it's interpreted (adds
// that many copies via the existing addItem() call, no schema change).
function QuantityStepper({ quantity, onChange }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-3.5 h-9 rounded-full bg-slate-50 border border-gray-100 px-2 flex-shrink-0">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        aria-label="decrease quantity"
        className="w-[26px] h-[26px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] flex items-center justify-center text-sm font-bold text-gray-500"
      >
        −
      </button>
      <span className="text-[15px] font-bold text-gray-900 min-w-[14px] text-center">{quantity}</span>
      <button
        onClick={() => onChange(quantity + 1)}
        aria-label="increase quantity"
        className="w-[26px] h-[26px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] flex items-center justify-center text-sm font-bold text-blue-600"
      >
        +
      </button>
    </div>
  );
}

export default memo(QuantityStepper);
