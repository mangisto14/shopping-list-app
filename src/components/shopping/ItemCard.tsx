// src/components/shopping/ItemCard.tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Item } from '../../hooks/useItems';
import { getCategoryStyle } from '../../theme/categoryStyles';

interface ItemCardProps {
  item: Item;
  // Number of identical-name units this row represents (see
  // ShoppingList.tsx's clusterByName()). A plain, unclustered item is
  // count === 1. `item` itself is always one representative unit from
  // the cluster (its id/is_done/category_id), used for toggle/edit
  // targeting - the cluster's other ids are handled by the callbacks
  // below, not by this component.
  count: number;
  categoryName?: string;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  // Only meaningful (and only rendered) when count > 1 - lets the user
  // adjust a grouped item's quantity without resorting to swipe-delete,
  // which now always removes the *entire* group (see onDelete).
  onIncrement?: () => void;
  onDecrement?: () => void;
}

// Swipe-to-delete tuning. REVEAL is where the row snaps to when the user
// lets go mid-drag (far enough to show the action, not far enough to
// delete); DELETE_THRESHOLD is "dragged far enough that the drag itself
// is the confirmation" (no second tap needed, matching iOS Mail's full-
// swipe behavior).
const REVEAL_PX = 80;
const DELETE_THRESHOLD_PX = 180;
const MAX_DRAG_PX = 220;
const DELETE_ANIMATION_MS = 180;

// min-h-[52px] keeps every row in the 50-56px target band regardless of
// content, rather than letting padding alone (which varies with font
// rendering) land outside it.
const ROW_SHAPE = 'bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_10px_rgba(15,23,42,0.05)] px-3 py-2 min-h-[52px]';

// Compact item row: category-color strip, checkbox, name, quantity. No
// category badge, no "added by" attribution, no avatar - the design
// spec for this pass calls all of that out explicitly as removed.
//
// Quantity is real, not fabricated: `items` still has no persisted
// quantity column, but identical-name items are now clustered client-
// side (ShoppingList.tsx's clusterByName()) and this row displays the
// cluster's actual size as "Nx" - each unit is still its own row under
// the hood, this is a display/interaction grouping only.

export default function ItemCard({ item, count, categoryName, onToggle, onDelete, onRename, onIncrement, onDecrement }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const style = getCategoryStyle(categoryName);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartTranslate = useRef(0);
  const pointerId = useRef<number | null>(null);
  const isScrollGesture = useRef(false);

  const closeSwipe = () => setTranslateX(0);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== item.name) {
      onRename(trimmed);
    } else {
      setName(item.name);
    }
    setIsEditing(false);
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    window.setTimeout(onDelete, DELETE_ANIMATION_MS);
  };

  // Swipe-to-reveal, implemented with Pointer Events (touch + mouse, no
  // gesture library). RTL note: dragging the finger left-to-right
  // (positive screen-space delta) reveals the action on the *left* edge
  // of the row - the trailing edge in RTL, matching the design and the
  // general convention that trailing-edge row actions are revealed by
  // swiping against reading direction (RTL reads right-to-left, so the
  // reveal gesture is left-to-right - the mirror image of the familiar
  // LTR "swipe left to reveal" iOS Mail pattern, not a literal copy of
  // it). `transform: translateX()` uses physical pixels regardless of
  // `dir`, so this is deliberate, not an RTL bug.
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragStartTranslate.current = translateX;
    pointerId.current = e.pointerId;
    isScrollGesture.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || pointerId.current !== e.pointerId || isScrollGesture.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;

    // A gesture that's more vertical than horizontal is a page scroll,
    // not a swipe - bail out and let the browser's native scroll take
    // over instead of fighting it.
    if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
      isScrollGesture.current = true;
      setDragging(false);
      setTranslateX(dragStartTranslate.current);
      return;
    }

    const next = Math.min(MAX_DRAG_PX, Math.max(0, dragStartTranslate.current + deltaX));
    setTranslateX(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (pointerId.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerId.current);
      } catch {
        // Already released (e.g. pointercancel) - fine to ignore.
      }
    }

    const wasOpenBeforeGesture = dragStartTranslate.current > 0;
    const totalMovement = Math.abs(translateX - dragStartTranslate.current);

    // A tap (negligible movement) on an already-open row closes it,
    // rather than re-snapping open or falling through to the checkbox/
    // name button's own click handler underneath.
    if (totalMovement < 4 && wasOpenBeforeGesture) {
      closeSwipe();
      return;
    }

    if (translateX >= DELETE_THRESHOLD_PX) {
      triggerDelete();
    } else if (translateX >= REVEAL_PX / 2) {
      setTranslateX(REVEAL_PX);
    } else {
      setTranslateX(0);
    }
  };

  const guardTap = (action: () => void) => {
    if (translateX !== 0) {
      closeSwipe();
      return;
    }
    action();
  };

  // Completed items: a deliberately separate render path with no swipe
  // machinery mounted at all - not just visually suppressed. Solid,
  // fully opaque row background; only the name text is muted. (Fixed a
  // real bug this way in an earlier pass: a shared row with
  // `opacity-60` on the whole container made its own solid background
  // translucent, letting the always-present red delete layer underneath
  // bleed through even at rest. Not rendering that layer at all for
  // completed rows removes the possibility entirely.)
  if (item.is_done) {
    return (
      <li className={`flex items-center gap-2.5 ${ROW_SHAPE}`}>
        <span className={`flex-shrink-0 w-1 self-stretch rounded-full ${style.strip} opacity-50`} aria-hidden="true" />
        <button
          onClick={onToggle}
          aria-label="toggle item"
          className="flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-green-500 bg-green-500 text-white flex items-center justify-center transition-all duration-200"
        >
          <svg width="11" height="9" viewBox="0 0 12 10" fill="none" aria-hidden="true">
            <path d="M1.5 5.5L4.5 8.5L10.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 min-w-0 border-b border-blue-400 bg-transparent focus:outline-none text-[15px] font-semibold"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 min-w-0 text-right truncate text-[15px] font-semibold text-gray-400 line-through opacity-70"
          >
            {item.name}
          </button>
        )}

        <span className="flex-shrink-0 text-[12px] font-medium text-gray-400 opacity-70">{count}x</span>
      </li>
    );
  }

  return (
    <li className={`relative overflow-hidden rounded-xl transition-opacity duration-[180ms] ${isDeleting ? 'opacity-0' : ''}`}>
      {/* Delete action, fixed at the left edge, revealed as the row
          above it slides right. Only ever mounted for active items -
          see the `item.is_done` branch above. */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-center bg-red-500 rounded-xl"
        style={{ width: MAX_DRAG_PX }}
      >
        <button
          onClick={triggerDelete}
          aria-label="מחיקת פריט"
          className="flex flex-col items-center gap-0.5 text-white px-4"
          style={{ opacity: Math.min(1, translateX / REVEAL_PX) }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M2.5 5h13M6.5 5V3.5A1.5 1.5 0 018 2h2a1.5 1.5 0 011.5 1.5V5M4.5 5l1 10.5A1.5 1.5 0 007 17h4a1.5 1.5 0 001.5-1.5L13.5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] font-bold">מחיקה</span>
        </button>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
          touchAction: 'pan-y',
        }}
        className={`relative flex items-center gap-2.5 ${ROW_SHAPE}`}
      >
        <span className={`flex-shrink-0 w-1 self-stretch rounded-full ${style.strip}`} aria-hidden="true" />

        <button
          onClick={() => guardTap(onToggle)}
          aria-label="toggle item"
          className="flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-gray-300 hover:border-green-400 flex items-center justify-center transition-all duration-200"
        />

        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 min-w-0 border-b border-blue-400 bg-transparent focus:outline-none text-[15px] font-semibold"
          />
        ) : (
          <button
            onClick={() => guardTap(() => setIsEditing(true))}
            className="flex-1 min-w-0 text-right truncate text-[15px] font-semibold text-gray-900"
          >
            {item.name}
          </button>
        )}

        {count > 1 && onIncrement && onDecrement ? (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => guardTap(onDecrement)}
              aria-label="הפחת כמות"
              className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center active:scale-90 transition-transform"
            >
              −
            </button>
            <span className="text-[12px] font-semibold text-gray-600 min-w-[18px] text-center">{count}x</span>
            <button
              onClick={() => guardTap(onIncrement)}
              aria-label="הוסף כמות"
              className="w-5 h-5 rounded-full bg-gray-100 text-blue-600 text-xs font-bold flex items-center justify-center active:scale-90 transition-transform"
            >
              +
            </button>
          </div>
        ) : (
          <span className="flex-shrink-0 text-[12px] font-medium text-gray-500">{count}x</span>
        )}
      </div>
    </li>
  );
}
