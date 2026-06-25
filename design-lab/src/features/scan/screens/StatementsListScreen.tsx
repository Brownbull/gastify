import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { EmptyState } from "@design-system/molecules/EmptyState";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import type { Platform } from "@design-system/organisms/AppSurface";
import { SAMPLE_STATEMENTS, type StatementSummary } from "../model/statementListFixtures";

const STATUS_META: Record<StatementSummary["status"], { label: string; cls: string }> = {
  matched: { label: "Conciliada", cls: "border-gt-positive bg-gt-positive-bg text-gt-positive" },
  processing: { label: "Procesando…", cls: "border-gt-line-strong bg-gt-bg-3 text-gt-ink-2" },
  failed: { label: "Con error", cls: "border-gt-negative bg-gt-negative-bg text-gt-negative" },
};

function StatementRow({ s, onOpen, onDelete }: { s: StatementSummary; onOpen?: () => void; onDelete?: () => void }) {
  const meta = STATUS_META[s.status];
  const pct = Math.round(s.coverageRatio * 100);
  return (
    <div className="flex items-stretch">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-gt-10 px-gt-12 py-gt-10 text-left transition hover:bg-gt-bg-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>
        <PixelIcon name="scan-statement" size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="flex items-center gap-gt-6">
          <span className="min-w-0 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{s.card}</span>
          {s.encrypted ? <PixelIcon name="action-lock" size={14} /> : null}
        </span>
        <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
          <PixelIcon name="chart-calendar" size={13} /> {s.period} · subida {s.uploadedAt}
        </span>
        {s.status === "matched" ? (
          <span className="mt-gt-2 flex items-center gap-gt-6">
            <span className="h-1.5 w-24 overflow-hidden rounded-gt-pill bg-gt-bg-3">
              <span className="block h-full rounded-gt-pill bg-gt-positive" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-gt-xs font-bold text-gt-ink-3">{pct}% conciliado · {s.lineCount} líneas</span>
          </span>
        ) : s.status === "failed" && s.encrypted ? (
          <span className="text-gt-xs font-medium text-gt-ink-3">Protegida — ingresa la contraseña para procesarla.</span>
        ) : null}
      </span>
      <span className={`shrink-0 rounded-gt-pill border-2 px-gt-8 py-gt-0 font-gt-display text-gt-xs font-extrabold ${meta.cls}`}>{meta.label}</span>
      </button>
      <button type="button" aria-label={`Eliminar cartola ${s.card} ${s.period}`} onClick={onDelete} className="grid w-12 shrink-0 place-items-center text-gt-ink-3 transition hover:bg-gt-negative-bg hover:text-gt-negative">
        <PixelIcon name="action-delete" size={22} />
      </button>
    </div>
  );
}

export interface StatementsListScreenProps {
  statements?: StatementSummary[];
  onBack?: () => void;
  /** start the upload flow (host opens ScanStatementUploadScreen). */
  onUpload?: () => void;
  /** open a statement's reconciliation. */
  onOpenStatement?: (id: string) => void;
  platform?: Platform;
}

/**
 * StatementsListScreen — the uploaded cartolas (backend GET /statements). Each
 * row shows the card + period + status (Conciliada with a coverage bar /
 * Procesando / Con error), with a lock on password-protected PDFs. "Subir
 * cartola" starts the upload flow; tapping a row opens its reconciliation.
 */
export function StatementsListScreen({ statements = SAMPLE_STATEMENTS, onBack, onUpload, onOpenStatement, platform = "mobile" }: StatementsListScreenProps) {
  const contentMax = platform === "desktop" ? "44rem" : undefined;
  const [items, setItems] = useState(statements);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const target = confirmId ? items.find((s) => s.id === confirmId) : null;
  const removeStatement = () => { setItems((prev) => prev.filter((s) => s.id !== confirmId)); setConfirmId(null); };
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Cartolas" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-12 pt-gt-12" style={{ maxWidth: contentMax }}>
          <button
            type="button"
            onClick={onUpload}
            className="flex w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-dashed border-gt-line-strong px-gt-12 py-gt-12 font-gt-display text-gt-md font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-primary-soft"
          >
            <PixelIcon name="scan-statement" size={22} /> Subir cartola
          </button>

          {items.length === 0 ? (
            <div className="grid place-items-center py-gt-24" style={{ minHeight: "40vh" }}>
              <EmptyState iconName="scan-statement" title="Sin cartolas" message="Sube el PDF de tu estado de cuenta para conciliar tus gastos automáticamente." />
            </div>
          ) : (
            <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              <div className="flex flex-col divide-y-2 divide-gt-line">
                {items.map((s) => (
                  <StatementRow key={s.id} s={s} onOpen={() => onOpenStatement?.(s.id)} onDelete={() => setConfirmId(s.id)} />
                ))}
              </div>
            </div>
          )}

          <p className="px-gt-4 text-center text-gt-xs font-medium text-gt-ink-3">
            Al eliminar una cartola se desbloquean las transacciones que había conciliado.
          </p>
        </div>
      </div>

      <Modal
        open={confirmId != null}
        onClose={() => setConfirmId(null)}
        title="¿Eliminar cartola?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={removeStatement}>Eliminar</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Se eliminará la cartola de <span className="font-extrabold text-gt-ink">{target?.card}</span> ({target?.period}). Las transacciones que había conciliado se desbloquearán y volverán a ser editables.
        </p>
      </Modal>
    </div>
  );
}
