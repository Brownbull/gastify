import { useRef } from "react";
import type { PointerEvent } from "react";

export interface LongPressHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerMove: (e: PointerEvent) => void;
  /** call at the top of onClick — returns true if the click followed a long-press
   *  (so the caller suppresses the normal click action). */
  consumeClick: () => boolean;
}

/**
 * useLongPress — fire `onLongPress` when a pointer is held for `delay` ms without
 * moving (a scroll/drag past ~10px cancels it). Touch + mouse. The companion
 * `consumeClick()` lets the click handler swallow the trailing click. Pass
 * undefined to disable (handlers no-op).
 */
export function useLongPress(onLongPress: (() => void) | undefined, delay = 450): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  return {
    onPointerDown: (e) => {
      if (!onLongPress) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, delay);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerMove: (e) => {
      if (!timer.current || !start.current) return;
      if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) clear();
    },
    consumeClick: () => { if (fired.current) { fired.current = false; return true; } return false; },
  };
}
