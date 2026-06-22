import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CircularProgress } from "@design-system/atoms/CircularProgress";
import { StatementSteps, STATEMENT_VIOLET } from "../components/StatementSteps";
import { CancelStatementDialog } from "../components/CancelStatementDialog";
import { STATEMENT_STAGE_META, SAMPLE_STATEMENT, type StatementPhase } from "@lib/statementFixtures";

/**
 * ScanStatementProcessingScreen (DM-43) — statement-scan screen 2 (Procesar).
 * The streaming stages between upload and reconciliation, mirroring the current
 * app's statementStore phases: uploading → queued → extracting → reconciling.
 * Carries the shared step indicator at step 2, a progress ring, the file chip,
 * the current stage label, and a non-blocking hint (processing runs in the
 * background, so the user can navigate away). Full-bleed flex column.
 */
export interface ScanStatementProcessingScreenProps {
  phase?: StatementPhase;
  onBack?: () => void;
  /** abandon the scan (confirmed via the X → cancel dialog). */
  onCancel?: () => void;
}

export function ScanStatementProcessingScreen({ phase = "extracting", onBack, onCancel }: ScanStatementProcessingScreenProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const stage = STATEMENT_STAGE_META.find((s) => s.phase === phase) ?? STATEMENT_STAGE_META[2];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Estado de cuenta" onBack={onBack ?? (() => {})} onClose={() => setCancelOpen(true)} />

      <div className="flex min-h-0 flex-1 flex-col px-gt-16 pb-gt-16">
        {/* steps band — Procesar (step 2) active */}
        <div className="mt-gt-12 flex flex-col gap-gt-8 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-12">
          <StatementSteps current={1} />
          <p className="text-center text-gt-sm font-medium text-gt-ink-2">
            <span className="font-extrabold text-gt-ink">Procesando tu cartola.</span> Extraemos las transacciones y luego las conciliamos con tus gastos.
          </p>
        </div>

        {/* file chip */}
        <div className="mt-gt-12 flex items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong px-gt-12 py-gt-10 shadow-gt-xs" style={{ backgroundColor: `${STATEMENT_VIOLET}14` }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface">
            <PixelIcon name="scan-statement" size={24} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{SAMPLE_STATEMENT.filename}</span>
            <span className="text-gt-xs font-medium text-gt-ink-3">{SAMPLE_STATEMENT.fileSizeLabel}</span>
          </span>
        </div>

        {/* progress — ring + current stage label */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-gt-16 text-center">
          <CircularProgress percent={stage.pct} size={96} strokeWidth={6} color="var(--primary)" />
          <p className="font-gt-display text-gt-xl font-extrabold text-gt-ink">{stage.label}</p>
        </div>

        {/* non-blocking hint */}
        <p className="shrink-0 pb-gt-16 text-center text-gt-xs font-medium text-gt-ink-3">
          Puedes seguir navegando — te avisamos cuando esté listo.
        </p>
      </div>

      {/* cancel-the-scan confirmation (triggered by the header X) */}
      <CancelStatementDialog open={cancelOpen} onDismiss={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); onCancel?.(); }} />
    </div>
  );
}
