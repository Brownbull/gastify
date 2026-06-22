import { useEffect, useRef, useState } from "react";

/** prefers-reduced-motion guard (count-up snaps to target). */
function reduced(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * useCountUp (legacy BoletApp parity) — animate a number 0 → target over
 * `duration` ms with easeOutCubic, via requestAnimationFrame. Re-runs whenever
 * `animKey` changes (e.g. a drill-down / show-more re-stagger), and snaps to the
 * target instantly under prefers-reduced-motion.
 */
export function useCountUp(target: number, opts?: { duration?: number; animKey?: number | string }): number {
  const { duration = 800, animKey } = opts ?? {};
  const [value, setValue] = useState(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced() || duration <= 0) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, animKey]);

  return value;
}
