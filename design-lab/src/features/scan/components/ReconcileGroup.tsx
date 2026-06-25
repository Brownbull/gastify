import { useId, type ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ArrowLeftIcon } from "@design-system/assets/icons";

/**
 * ReconcileGroup (DM-43) — a collapsible bucket card for the statement
 * reconciliation screen. Header: bare title icon · name … [optional action
 * square] · count badge. The whole header toggles (no chevron — the affordance
 * is intuitive). The three groups form a single-open ACCORDION, so
 * `open`/`onToggle` are controlled by the screen (opening one minimizes the
 * others).
 *
 *   - title icon is the bare pixel glyph (no container box), sized up.
 *   - `done` turns the count badge green — the section is fully resolved.
 *   - `action` is an optional SQUARE icon button before the count badge: a green
 *     "create-all" plus, or (with `revert`) the back-arrow that returns the
 *     section to its initial state.
 */
export interface ReconcileGroupProps {
  label: string;
  count: number;
  icon: string;
  /** verdict accent — drives border + tint (a CSS color string). */
  accent: string;
  /** soft tint behind the header (a CSS color string, usually accent + alpha). */
  tint: string;
  open: boolean;
  onToggle: () => void;
  /** all rows resolved → the count badge turns green. */
  done?: boolean;
  /**
   * optional header action, rendered as a SQUARE icon button before the count
   * badge. `revert` swaps the green "create-all" plus for the back-arrow
   * (Deshacer) glyph that returns the section to its initial state.
   */
  action?: { onClick: () => void; revert?: boolean; ariaLabel: string };
  children: ReactNode;
}

export function ReconcileGroup({ label, count, icon, accent, tint, open, onToggle, done = false, action, children }: ReconcileGroupProps) {
  const panelId = useId();

  return (
    <section className="overflow-hidden rounded-gt-2xl border-2 shadow-gt-sm" style={{ borderColor: accent, backgroundColor: tint }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-gt-8 px-gt-12 py-gt-10 text-left"
      >
        {/* bare, bigger title icon — no container box */}
        <PixelIcon name={icon} size={32} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{label}</span>
        {/* header action — a SQUARE icon button (sits BEFORE the count badge). */}
        {action ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={action.ariaLabel}
            onClick={(e) => { e.stopPropagation(); action.onClick(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); action.onClick(); } }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs transition hover:-translate-y-0.5"
          >
            {action.revert ? <ArrowLeftIcon className="h-4 w-4" /> : <PixelIcon name="action-add" size={22} />}
          </span>
        ) : null}
        {/* count badge — green when the whole section is resolved */}
        <span
          className="grid h-7 min-w-7 shrink-0 place-items-center rounded-gt-pill border-2 px-gt-4 text-gt-sm font-extrabold leading-none transition"
          style={done
            ? { borderColor: "var(--positive-primary)", backgroundColor: "color-mix(in srgb, var(--positive-primary) 16%, transparent)", color: "var(--positive-primary)" }
            : { borderColor: "var(--border-medium)", backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
        >
          {count}
        </span>
      </button>
      {/* animated collapse — the body grows from / shrinks into the header
          (grid-rows 0fr↔1fr), matching the FilterSheet convention so sections
          never pop in/out. */}
      <div className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-gt-bounce ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div id={panelId} className="min-h-0 overflow-hidden">
          {count > 0 ? (
            <div className="divide-y-2 divide-gt-line bg-gt-surface">{children}</div>
          ) : (
            <p className="bg-gt-surface px-gt-12 py-gt-12 text-center text-gt-xs font-bold text-gt-ink-3">Nada en este grupo.</p>
          )}
        </div>
      </div>
    </section>
  );
}
