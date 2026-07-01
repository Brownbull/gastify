/**
 * Switch (atom) — a binary on/off toggle, distinct from SegmentedToggle (which
 * picks one of 2..n). Playful-Geometric depth grammar: an ink-bordered pill track
 * (stays neutral) holding a white knob that LIGHTS UP gt-primary when ON and
 * slides right — only the inner circle changes, not the whole track. The knob's
 * outer gap is identical at both ends (symmetric travel). Controlled — the host
 * owns `checked` (immutable onChange); a real `role="switch"` button.
 *
 * Vendored into web from design-lab/src/design-system/atoms/Switch.tsx (D102):
 * self-contained (pure gt-* utilities), no import changes needed.
 */
export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** spinner in the knob + inert (e.g. while a permission request resolves). */
  loading?: boolean;
  /** accessible name. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function Switch({ checked, onChange, disabled = false, loading = false, label, size = "md", className = "" }: SwitchProps) {
  const d = size === "sm" ? { w: 40, h: 24, k: 18 } : { w: 48, h: 28, k: 22 };
  const off = 2; // the outer gap — identical at both ends so travel is symmetric
  // content box = track width − 2 borders; the ON position mirrors OFF's gap.
  const on = d.w - 4 - d.k - off;
  const inert = disabled || loading;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={inert}
      onClick={() => onChange(!checked)}
      className={`relative inline-block shrink-0 rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3 shadow-gt-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30 ${
        inert ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
      style={{ width: d.w, height: d.h }}
    >
      {/* only the knob lights up (gt-primary) when ON — the track stays neutral */}
      <span
        className={`absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full border-2 border-gt-line-strong shadow-gt-xs transition-all duration-150 ease-gt-bounce ${
          checked ? "bg-gt-primary" : "bg-white"
        }`}
        style={{ width: d.k, height: d.k, left: checked ? on : off }}
      >
        {loading ? <span className={`block h-2.5 w-2.5 animate-spin rounded-full border-2 border-t-transparent ${checked ? "border-white" : "border-gt-ink-3"}`} /> : null}
      </span>
    </button>
  );
}
