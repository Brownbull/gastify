import { PixelIcon } from "@design-system/assets/PixelIcon";
import {
  SAMPLE_OUTCOME,
  SAMPLE_STATEMENT,
  summarizeOutcome,
  clpMinor,
  type OutcomeItem,
} from "@lib/statementFixtures";

/**
 * ScanStatementSuccessScreen (DM-43) — statement-scan screen 5, the terminal
 * success state shown after "Confirmar y guardar" commits. A celebration hero +
 * a result recap (how many conciliated / created / discarded + the total saved)
 * + the exits (view the saved transactions, or return home). No header chrome,
 * no cancel — the scan is done and committed, so there is nothing to abandon.
 */
export interface ScanStatementSuccessScreenProps {
  items?: OutcomeItem[];
  issuer?: string;
  periodLabel?: string;
  /** go to the transaction list (see what was saved). */
  onViewTransactions?: () => void;
  /** return to the home screen. */
  onHome?: () => void;
}

function ResultRow({ icon, color, label, value, muted = false }: { icon: string; color: string; label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-gt-8 ${muted ? "opacity-70" : ""}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs">
        <PixelIcon name={icon} size={18} className={muted ? "grayscale" : ""} />
      </span>
      <span className="min-w-0 flex-1 font-gt-display text-gt-sm font-extrabold text-gt-ink">{label}</span>
      <span className="shrink-0 font-gt-display text-gt-xl font-extrabold leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

export function ScanStatementSuccessScreen({
  items = SAMPLE_OUTCOME,
  issuer = SAMPLE_STATEMENT.issuer,
  periodLabel = SAMPLE_STATEMENT.periodLabel,
  onViewTransactions,
  onHome,
}: ScanStatementSuccessScreenProps) {
  const s = summarizeOutcome(items);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      {/* celebration hero + result recap */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-gt-16 overflow-y-auto px-gt-16 py-gt-16 text-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong shadow-gt-sm" style={{ backgroundColor: "color-mix(in srgb, var(--positive-primary) 15%, transparent)" }}>
          <PixelIcon name="scan-success" size={56} />
        </div>

        <div className="flex flex-col gap-gt-4">
          <h1 className="font-gt-display text-gt-3xl font-extrabold text-gt-ink">¡Cartola guardada!</h1>
          <p className="text-gt-sm font-medium text-gt-ink-3">{issuer} · {periodLabel}</p>
        </div>

        {/* result recap */}
        <section className="flex w-full max-w-sm flex-col gap-gt-10 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 text-left shadow-gt-sm">
          <ResultRow icon="scan-success" color="var(--positive-primary)" label="Conciliadas" value={s.conciliatedCount} />
          <ResultRow icon="action-add" color="var(--primary)" label="Creadas" value={s.createdCount} />
          <ResultRow icon="action-delete" color="var(--border-medium)" label="Descartadas" value={s.discardedCount} muted />
          <div className="flex items-center justify-between border-t-2 border-gt-line pt-gt-10">
            <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink-2">Total guardado</span>
            <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{clpMinor(s.savedTotalMinor)}</span>
          </div>
        </section>
      </div>

      {/* exits */}
      <div className="flex shrink-0 flex-col gap-gt-8 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-32 pt-gt-12">
        <button
          type="button"
          onClick={onViewTransactions}
          className="flex h-12 w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface font-gt-display text-gt-md font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5"
        >
          <PixelIcon name="fin-receipt" size={22} />
          Ver transacciones
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex h-12 w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong font-gt-display text-gt-md font-extrabold text-white shadow-gt-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <PixelIcon name="nav-home" size={22} />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
