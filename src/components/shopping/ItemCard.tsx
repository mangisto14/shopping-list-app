// src/components/shopping/ItemCard.tsx
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Item } from '../../hooks/useItems';
import { getCategoryStyle } from '../../theme/categoryStyles';
import { useDeveloperConsole } from '../../config/DeveloperConsoleContext';

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
  // Called once the row's own slide/fade/collapse delete animation has
  // fully played out - this is the point the caller should actually
  // remove the item(s).
  onDelete: () => void;
  onRename: (newName: string) => void;
  // Only meaningful (and only rendered) when count > 1 - lets the user
  // adjust a grouped item's quantity without resorting to swipe-delete,
  // which now always removes the *entire* group (see onDelete).
  onIncrement?: () => void;
  onDecrement?: () => void;
  // Only ever true for one row at a time (the first rendered shopping
  // item in the list) - ShoppingList.tsx decides which, this component
  // just plays the hint when told to. Defaults to false so every other
  // row stays silent.
  playEntryHint?: boolean;
}

// Swipe-to-delete tuning. revealThreshold (dev-settings, default 80px)
// is where the row snaps to when the user lets go mid-drag (far enough
// to show the action, not far enough to delete); DELETE_THRESHOLD is
// "dragged far enough that the drag itself is the confirmation" (no
// second tap needed, matching iOS Mail's full-swipe behavior). Only
// revealThreshold is dev-tunable for now - see src/config/devSettings.ts.
const DELETE_THRESHOLD_PX = 180;
const MAX_DRAG_PX = 220;

// Delete choreography: slide fully off to the right, fade, then collapse
// height so the rows below animate upward instead of snapping into
// place. Both phases play out locally in this component before onDelete
// fires, so by the time the parent actually removes the item the row is
// already invisible/zero-height - no jump cut. Both phases share the
// same dev-tunable animationDuration (default 220ms).
const SLIDE_OUT_PX = 420;

// Entry hint: a one-time nudge shortly after the row mounts, teaching
// the swipe-right-to-delete gesture without feeling like a tutorial.
// Total: 500 delay + 220 slide + 500 hold + 220 return = 1440ms.
const ENTRY_HINT_DELAY_MS = 500;
const ENTRY_HINT_DISTANCE_PX = 18;
const ENTRY_HINT_HOLD_MS = 500;
const ENTRY_HINT_TRANSITION_MS = 220;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// min-h-[52px] keeps every row in the 50-56px target band regardless of
// content, rather than letting padding alone (which varies with font
// rendering) land outside it. The border makes the row read as a
// complete, self-contained card rather than just a flat colored block -
// it's part of the card element itself, so it moves with the card and
// stays visible for the entire swipe, never interrupted by the delete
// layer underneath.
const ROW_BASE = 'bg-white rounded-xl px-3 py-2 min-h-[52px] border border-gray-100';
const ROW_SHADOW_REST = 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_10px_rgba(15,23,42,0.05)]';
const ROW_SHADOW_DRAG = 'shadow-[0_3px_6px_rgba(15,23,42,0.08),0_10px_24px_rgba(15,23,42,0.12)]';

// Compact item row: category-color strip, checkbox, name, quantity. No
// category badge, no "added by" attribution, no avatar - the design
// spec for this pass calls all of that out explicitly as removed.
//
// Quantity is real, not fabricated: `items` still has no persisted
// quantity column, but identical-name items are now clustered client-
// side (ShoppingList.tsx's clusterByName()) and this row displays the
// cluster's actual size as "Nx" - each unit is still its own row under
// the hood, this is a display/interaction grouping only.

export default function ItemCard({ item, count, categoryName, onToggle, onDelete, onRename, onIncrement, onDecrement, playEntryHint = false }: ItemCardProps) {
  const { swipe: swipeSettings, featureFlags } = useDeveloperConsole();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hinting, setHinting] = useState(false);
  const style = getCategoryStyle(categoryName);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartTranslate = useRef(0);
  const pointerId = useRef<number | null>(null);
  const isScrollGesture = useRef(false);
  const hasCaptured = useRef(false);
  const hasVibratedThreshold = useRef(false);
  // Dev-settings-only: schedules closeSwipe() after autoCloseDelay ms
  // once a row is left open (revealed, undeleted). autoCloseDelay
  // defaults to 0 (disabled), matching this component's pre-existing
  // behavior of never auto-closing on its own.
  const autoCloseTimer = useRef<number | null>(null);

  const clearAutoCloseTimer = () => {
    if (autoCloseTimer.current !== null) {
      window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  };

  useEffect(() => clearAutoCloseTimer, []);

  const closeSwipe = () => {
    clearAutoCloseTimer();
    setTranslateX(0);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== item.name) {
      onRename(trimmed);
    } else {
      setName(item.name);
    }
    setIsEditing(false);
  };

  // One-time entry hint: reveal the swipe affordance briefly, then
  // settle back. Only plays when the parent asks for it (the first
  // rendered row) - skipped for every other row, for completed rows (no
  // swipe there), and under reduced-motion.
  useEffect(() => {
    if (!playEntryHint || item.is_done || prefersReducedMotion()) return;

    const delayTimer = window.setTimeout(() => {
      setHinting(true);
      setTranslateX(ENTRY_HINT_DISTANCE_PX);
      const holdTimer = window.setTimeout(() => {
        setTranslateX(0);
        window.setTimeout(() => setHinting(false), ENTRY_HINT_TRANSITION_MS);
      }, ENTRY_HINT_HOLD_MS);
      return () => window.clearTimeout(holdTimer);
    }, ENTRY_HINT_DELAY_MS);

    return () => window.clearTimeout(delayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerDelete = () => {
    clearAutoCloseTimer();
    const reduced = prefersReducedMotion();
    setIsDeleting(true);
    setTranslateX(reduced ? translateX : SLIDE_OUT_PX);
    const slideMs = reduced ? 0 : swipeSettings.animationDuration;
    const collapseMs = reduced ? 80 : swipeSettings.animationDuration;
    window.setTimeout(() => setCollapsed(true), slideMs);
    window.setTimeout(onDelete, slideMs + collapseMs);
  };

  // Swipe-to-reveal, implemented with Pointer Events (touch + mouse, no
  // gesture library). Dragging the finger left-to-right (positive
  // screen-space delta) slides the row to the right, revealing the
  // permanent red delete strip/panel fixed at the row's left edge.
  // `transform: translateX()` uses physical pixels regardless of `dir`,
  // so this works the same in RTL as LTR - deliberate, not an RTL bug.
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragStartTranslate.current = translateX;
    pointerId.current = e.pointerId;
    isScrollGesture.current = false;
    hasCaptured.current = false;
    hasVibratedThreshold.current = false;
    clearAutoCloseTimer();
    setHinting(false);
    setDragging(true);
    // Deliberately NOT capturing the pointer here. Chromium retargets
    // the synthetic `click` a tap produces to whichever element holds
    // pointer capture at pointerup time - if this row (which has no
    // onClick of its own) captures on every pointerdown unconditionally,
    // a plain tap on the checkbox or name button underneath it never
    // reaches their own onClick handlers at all, silently swallowing
    // every tap (confirmed directly: this made the checkbox
    // untoggleable via any real pointer-driven click, not just an e2e
    // testing artifact). Capture is deferred to handlePointerMove,
    // once actual drag movement is confirmed - a tap that never moves
    // enough to count as a drag never captures the pointer, so its
    // click reaches its real target normally.
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

    // Only once movement is large enough to be a real drag (matching
    // endDrag's own "totalMovement < 4 is a tap" threshold) do we
    // capture the pointer, so a fast drag that strays outside the row
    // keeps tracking correctly without affecting plain taps.
    if (!hasCaptured.current && (Math.abs(deltaX) >= 4 || Math.abs(deltaY) >= 4)) {
      hasCaptured.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const next = Math.min(MAX_DRAG_PX, Math.max(0, dragStartTranslate.current + deltaX));
    setTranslateX(next);

    if (next >= DELETE_THRESHOLD_PX && !hasVibratedThreshold.current) {
      hasVibratedThreshold.current = true;
      if (featureFlags.enableHaptics) {
        try {
          navigator.vibrate?.(10);
        } catch {
          // Unsupported - fine to ignore, this is a best-effort touch.
        }
      }
    } else if (next < DELETE_THRESHOLD_PX) {
      hasVibratedThreshold.current = false;
    }
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
    } else if (translateX >= swipeSettings.revealThreshold / 2) {
      setTranslateX(swipeSettings.revealThreshold);
      if (swipeSettings.autoCloseDelay > 0) {
        clearAutoCloseTimer();
        autoCloseTimer.current = window.setTimeout(closeSwipe, swipeSettings.autoCloseDelay);
      }
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
      <li className={`flex items-center gap-2.5 ${ROW_BASE} ${ROW_SHADOW_REST}`}>
        <span className={`flex-shrink-0 w-1 self-stretch rounded-full ${style.strip} opacity-50`} aria-hidden="true" />
        <button
          onClick={onToggle}
          aria-label="toggle item"
          className="relative flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-green-500 bg-green-500 text-white flex items-center justify-center transition-all duration-200"
        >
          {/* Invisible hit-slop: expands the tappable area to ~44px
              without growing the visible circle - a transparent child
              positioned outside the button's own box still bubbles its
              click up to this button. */}
          <span className="absolute -inset-[11px]" aria-hidden="true" />
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

  // Dev/QA feature flag: Enable Swipe Delete off. Same non-swipeable
  // shape as the completed-item row above (no pointer/drag machinery
  // mounted at all), but for an active item - which still needs a way
  // to delete, so a plain button replaces the swipe gesture rather
  // than removing deletion entirely.
  if (!featureFlags.enableSwipeDelete) {
    return (
      <li className={`flex items-center gap-2.5 ${ROW_BASE} ${ROW_SHADOW_REST}`}>
        <span className={`flex-shrink-0 w-1 self-stretch rounded-full ${style.strip}`} aria-hidden="true" />
        <button
          onClick={onToggle}
          aria-label="toggle item"
          className="relative flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-gray-300 hover:border-green-400 flex items-center justify-center transition-all duration-200"
        >
          <span className="absolute -inset-[11px]" aria-hidden="true" />
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
            className="flex-1 min-w-0 text-right truncate text-[15px] font-semibold text-gray-900"
          >
            {item.name}
          </button>
        )}

        <span className="flex-shrink-0 text-[12px] font-medium text-gray-500">{count}x</span>

        <button onClick={onDelete} aria-label="מחיקת פריט" className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors px-1">
          🗑️
        </button>
      </li>
    );
  }

  const revealProgress = Math.min(1, translateX / swipeSettings.revealThreshold);
  const pastThreshold = translateX >= DELETE_THRESHOLD_PX;
  const iconScale = pastThreshold ? 1.15 : 0.8 + 0.2 * revealProgress;

  return (
    <li
      className={`relative rounded-xl transition-[opacity,max-height] ease-in-out ${isDeleting ? 'opacity-0' : 'opacity-100'}`}
      style={{
        overflow: 'hidden',
        maxHeight: collapsed ? 0 : 96,
        transitionDuration: `${swipeSettings.animationDuration}ms`,
      }}
    >
      {/* Delete action, fixed at the left edge, revealed as the row
          above it slides right. Only ever mounted for active items -
          see the `item.is_done` branch above. This container's own
          size/position never changes - only the icon inside is
          repositioned to the left edge, via absolute placement within
          it, so it stays put regardless of the card's drag. */}
      <div
        className={`absolute inset-y-0 left-0 rounded-xl transition-colors duration-150 ${
          pastThreshold ? 'bg-red-600' : 'bg-red-500'
        }`}
        style={{ width: MAX_DRAG_PX }}
      >
        <button
          onClick={triggerDelete}
          aria-label="מחיקת פריט"
          className="absolute left-3.5 top-1/2 flex flex-col items-center gap-0.5 text-white"
          style={{ opacity: revealProgress, transform: `translateY(-50%) scale(${iconScale})` }}
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
        data-testid="item-row"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : `transform ${hinting ? ENTRY_HINT_TRANSITION_MS : swipeSettings.revealDuration}ms ease-out`,
          touchAction: 'pan-y',
        }}
        className={`relative flex items-center gap-2.5 overflow-hidden ${ROW_BASE} ${dragging ? ROW_SHADOW_DRAG : ROW_SHADOW_REST}`}
      >
        {/* Permanent swipe-to-delete affordance - not a category
            indicator (that's the separate strip below). Always visible,
            moves with the card, clipped to the card's own rounded
            corners by this container's overflow-hidden. */}
        <span className="absolute inset-y-0 left-0 w-[2px] bg-red-500" aria-hidden="true" />

        <span className={`flex-shrink-0 w-1 self-stretch rounded-full ${style.strip}`} aria-hidden="true" />

        <button
          onClick={() => guardTap(onToggle)}
          aria-label="toggle item"
          className="relative flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 border-gray-300 hover:border-green-400 flex items-center justify-center transition-all duration-200"
        >
          <span className="absolute -inset-[11px]" aria-hidden="true" />
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
