import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { StatementSteps } from "../components/StatementSteps";
import { ReconcileGroup } from "../components/ReconcileGroup";
import { CancelStatementDialog } from "../components/CancelStatementDialog";
import {
  SAMPLE_OUTCOME,
  summarizeOutcome,
  clpMinor,
  type OutcomeItem,
  type OutcomeKind,
} from "@lib/statementFixtures";

/**
 * ScanStatementConfirmScreen (DM-43) — statement-scan screen 4 (Confirmar), the
 * commit step. Shows the statistics (deferred from Conciliar) and the projected
 * outcome of everything the user staged: what will be CREATED (new
 * transactions), CONCILIATED (linked to existing app transactions), and
 * DISCARDED. Read-only — the decisions were made on Conciliar; the back arrow
 * returns there to reconfigure, and "Confirmar y guardar" is the actual commit.
 * Steps 3 ↔ 4 are freely traversable; nothing is written until this submit.
 * Full-bleed flex column with the X → cancel dialog like the other steps.
 */
export interface ScanStatementConfirmScreenProps {
  items?: OutcomeItem[];
  /** return to Conciliar (step 3) to reconfigure. */
  onBack?: () => void;
  /** abandon the scan (confirmed via the X → cancel dialog). */
  onCancel?: () => void;
  /** the commit — write the staged transactions. */
  onConfirm?: () => void;
}

interface OutcomeMeta {
  kind: OutcomeKind;
  label: string;
  icon: string;
  accent: string;
  tint: string;
  defaultOpen: boolean;
}

const OUTCOME_META: OutcomeMeta[] = [
  { kind: "created", label: "Se crearán", icon: "action-add", accent: "var(--primary)", tint: "rgba(139,92,246,0.08)", defaultOpen: true },
  { kind: "conciliated", label: "Se conciliarán", icon: "scan-success", accent: "var(--positive-primary)", tint: "rgba(16,185,129,0.08)", defaultOpen: true },
  { kind: "discarded", label: "Se descartarán", icon: "action-delete", accent: "var(--border-medium)", tint: "rgba(30,41,59,0.05)", defaultOpen: false },
];

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-gt-2 rounded-gt-lg border-2 border-gt-line bg-gt-bg-3 px-gt-6 py-gt-10">
      <span className="font-gt-display text-gt-2xl font-extrabold leading-none" style={{ color }}>{value}</span>
      <span className="text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-gt-ink-3">{label}</span>
    </div>
  );
}

/** read-only outcome row — one of three shapes by kind. */
function OutcomeRow({ item }: { item: OutcomeItem }) {
  const l = item.line;

  if (item.kind === "discarded") {
    return (
      <div className="flex items-center gap-gt-8 px-gt-12 py-gt-10 opacity-60">
        <PixelIcon name="scan-error" size={24} className="shrink-0 grayscale" />
        <span className="min-w-0 flex-1 truncate font-gt-display text-gt-sm font-extrabold text-gt-ink-2 line-through">{l.description}</span>
        <span className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-ink-3">{clpMinor(l.amountMinor)}</span>
      </div>
    );
  }

  if (item.kind === "conciliated") {
    const m = item.matched!;
    return (
      <div className="flex items-center gap-gt-8 px-gt-12 py-gt-10">
        <PixelIcon name={m.storeIcon} size={28} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{l.description}</span>
          <span className="mt-gt-2 flex items-center gap-gt-6">
            <span className="shrink-0 truncate text-gt-xs font-medium text-gt-ink-3">con {m.merchant}</span>
            <CategoryChip category={m.category} size="sm" />
          </span>
        </span>
        <span className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-ink">{clpMinor(l.amountMinor)}</span>
      </div>
    );
  }

  // created
  return (
    <div className="flex items-center gap-gt-8 px-gt-12 py-gt-10">
      <PixelIcon name={l.storeIcon ?? "store-other"} size={28} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{l.description}</span>
        <span className="mt-gt-2 flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-3">
          <PixelIcon name="chart-calendar" size={12} />{l.date}
          {l.installment ? <><span className="text-gt-line-strong">·</span>{l.installment} cuota</> : null}
        </span>
        <span className="mt-gt-2 inline-block"><CategoryChip category={item.category ?? "otros"} size="sm" /></span>
      </span>
      <span className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-ink">{clpMinor(l.amountMinor)}</span>
    </div>
  );
}

export function ScanStatementConfirmScreen({ items = SAMPLE_OUTCOME, onBack, onCancel, onConfirm }: ScanStatementConfirmScreenProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [open, setOpen] = useState<Record<OutcomeKind, boolean>>({ created: true, conciliated: true, discarded: false });

  const summary = summarizeOutcome(items);
  const itemsOf = (k: OutcomeKind) => items.filter((it) => it.kind === k);
  const toggle = (k: OutcomeKind) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Confirmar" onBack={onBack ?? (() => {})} onClose={() => setCancelOpen(true)} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="flex flex-col gap-gt-12 pt-gt-12">
          {/* steps band — Confirmar (step 4) active, collapsible */}
          <div className="rounded-gt-xl border-2 border-gt-line bg-gt-bg-3">
            <button type="button" onClick={() => setInfoOpen((p) => !p)} aria-expanded={infoOpen} className="flex w-full items-center gap-gt-8 px-gt-12 pt-gt-12 pb-gt-8 text-left">
              <span className="min-w-0 flex-1"><StatementSteps current={3} /></span>
              <span aria-hidden="true" className={`mt-gt-2 h-2 w-2 shrink-0 self-start border-b-2 border-r-2 border-gt-ink-3 transition-transform duration-150 ease-gt-bounce ${infoOpen ? "translate-y-px rotate-225" : "-translate-y-px rotate-45"}`} />
            </button>
            {infoOpen ? (
              <p className="px-gt-12 pb-gt-12 text-center text-gt-sm font-medium text-gt-ink-2">
                <span className="font-extrabold text-gt-ink">Revisa lo que se guardará.</span> Vuelve a conciliar si necesitas ajustar; recién al confirmar se guarda.
              </p>
            ) : null}
          </div>

          {/* summary card — the statistics (deferred from Conciliar) */}
          <section className="flex flex-col gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm">
            <div className="flex items-center gap-gt-8">
              <PixelIcon name="scan-success" size={28} className="shrink-0" />
              <span className="min-w-0 flex-1 font-gt-display text-gt-lg font-extrabold text-gt-ink">Listo para guardar</span>
              <span className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-positive">{Math.round(summary.coverageRatio * 100)}% cubierto</span>
            </div>
            <div className="grid grid-cols-3 gap-gt-8">
              <StatTile value={summary.createdCount} label="Crear" color="var(--primary)" />
              <StatTile value={summary.conciliatedCount} label="Conciliar" color="var(--positive-primary)" />
              <StatTile value={summary.discardedCount} label="Descartar" color="var(--border-medium)" />
            </div>
            <div className="flex items-center justify-between border-t-2 border-gt-line pt-gt-10">
              <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink-2">Total a guardar</span>
              <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{clpMinor(summary.savedTotalMinor)}</span>
            </div>
          </section>

          {/* outcome groups — read-only, independently collapsible */}
          <div className="flex flex-col gap-gt-8">
            {OUTCOME_META.map((m) => {
              const list = itemsOf(m.kind);
              return (
                <ReconcileGroup
                  key={m.kind}
                  label={m.label}
                  count={list.length}
                  icon={m.icon}
                  accent={m.accent}
                  tint={m.tint}
                  open={open[m.kind]}
                  onToggle={() => toggle(m.kind)}
                >
                  {list.map((it, i) => (
                    <OutcomeRow key={i} item={it} />
                  ))}
                </ReconcileGroup>
              );
            })}
          </div>
        </div>
      </div>

      {/* footer — the commit */}
      <div className="shrink-0 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-32 pt-gt-12">
        <button type="button" onClick={onConfirm} className="flex h-12 w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-positive font-gt-display text-gt-md font-extrabold text-white shadow-gt-sm transition hover:-translate-y-0.5">
          <PixelIcon name="scan-success" size={24} />
          Confirmar y guardar
        </button>
      </div>

      {/* cancel-the-scan confirmation (triggered by the header X) */}
      <CancelStatementDialog open={cancelOpen} onDismiss={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); onCancel?.(); }} />
    </div>
  );
}
