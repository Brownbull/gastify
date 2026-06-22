/**
 * StatementSteps (DM-43) — the progressive step indicator shared across the
 * statement-scan flow (Subir · Procesar · Conciliar · Confirmar). Nodes are
 * centered with connectors flexing between; the current step is violet, done
 * steps show a ✓, pending steps are grey outlines. Used inside the subtle info
 * band on each statement screen.
 *
 * Conciliar (2) ↔ Confirmar (3) are freely traversable and nothing commits to
 * the app until the user submits on Confirmar — the user stages all their
 * choices on Conciliar, reviews the projected outcome on Confirmar, and can
 * bounce back to reconfigure before committing.
 */
export const STATEMENT_VIOLET = "#8B5CF6";
export const STATEMENT_STEPS = ["Subir", "Procesar", "Conciliar", "Confirmar"];

export function StatementSteps({ current }: { current: number }) {
  return (
    <div className="flex items-start">
      {STATEMENT_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* left connector (hidden on first) keeps the node centered in its cell */}
              <span className={`h-0.5 flex-1 rounded-gt-pill ${i === 0 ? "opacity-0" : i <= current ? "" : "bg-gt-line"}`} style={i !== 0 && i <= current ? { backgroundColor: STATEMENT_VIOLET } : undefined} />
              <span
                className={`mx-gt-2 grid h-8 w-8 shrink-0 place-items-center rounded-gt-pill border-2 font-gt-display text-gt-xs font-extrabold leading-none transition ${
                  active ? "border-gt-line-strong text-white shadow-gt-xs" : done ? "border-gt-line-strong text-white" : "border-gt-line bg-gt-surface text-gt-ink-3"
                }`}
                style={active || done ? { backgroundColor: STATEMENT_VIOLET } : undefined}
              >
                {done ? "✓" : i + 1}
              </span>
              {/* right connector (hidden on last) */}
              <span className={`h-0.5 flex-1 rounded-gt-pill ${i === STATEMENT_STEPS.length - 1 ? "opacity-0" : i < current ? "" : "bg-gt-line"}`} style={i !== STATEMENT_STEPS.length - 1 && i < current ? { backgroundColor: STATEMENT_VIOLET } : undefined} />
            </div>
            <span className={`mt-gt-2 font-gt-display text-[11px] font-extrabold ${active ? "text-gt-ink" : "text-gt-ink-3"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
