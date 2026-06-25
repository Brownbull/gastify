import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { PaymentChip } from "@design-system/molecules/PaymentChip";
import { PaymentPicker } from "@design-system/molecules/PaymentPicker";
import { SAMPLE_CARDS, type PaymentMethod } from "@lib/paymentMethods";
import { SAMPLE_STATEMENT } from "@lib/statementFixtures";
import { StatementSteps, STATEMENT_VIOLET } from "../components/StatementSteps";
import { CancelStatementDialog } from "../components/CancelStatementDialog";

/**
 * ScanStatementUploadScreen (DM-43) — statement-scan screen 1: upload a credit-
 * card statement PDF. Grounded on the CURRENT app (routes/statements.tsx +
 * useStatementUpload): a card-alias selector, a PDF drop-zone, an optional
 * encrypted-PDF password, a MANDATORY AI-processing consent checkbox, a "cómo
 * funciona" steps note, and "Iniciar escaneo" (gated on file + consent). Violet
 * theme (statement mode). A full-bleed flex column in the AppSurface frame.
 */
export interface ScanStatementUploadScreenProps {
  /** start with a file already chosen (demo the selected state). */
  initialFile?: boolean;
  /** super-credit balance (for the cost check). */
  superCredits?: number;
  onBack?: () => void;
  onScan?: (cardId: string | null) => void;
  /** abandon the scan (confirmed via the X → cancel dialog). */
  onCancel?: () => void;
}

const VIOLET = STATEMENT_VIOLET;
const SUPER_COST = 1; // súper credits a statement scan costs

export function ScanStatementUploadScreen({ initialFile = false, superCredits = 3, onBack, onScan, onCancel }: ScanStatementUploadScreenProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [file, setFile] = useState(initialFile);
  const [cardId, setCardId] = useState<string | null>(null);
  const [cards, setCards] = useState<PaymentMethod[]>(SAMPLE_CARDS);
  const [cardOpen, setCardOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);

  const enoughCredits = superCredits >= SUPER_COST;
  const canScan = file && consent && enoughCredits;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Estado de cuenta" onBack={onBack ?? (() => {})} onClose={() => setCancelOpen(true)} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="flex flex-col gap-gt-16 pt-gt-12">
          {/* progressive steps + current-step description — a subtle, non-editable info band */}
          <div className="flex flex-col gap-gt-8 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-12">
            <StatementSteps current={0} />
            <p className="text-center text-gt-sm font-medium text-gt-ink-2">
              <span className="font-extrabold text-gt-ink">Sube tu cartola en PDF.</span> Luego extraemos las transacciones y las conciliamos con tus gastos.
            </p>
          </div>

          {/* card alias (optional) */}
          <div className="flex flex-col gap-gt-4">
            <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Tarjeta (opcional)</span>
            {/* tappable pill → opens the settled full-screen PaymentPicker (rows per card) */}
            <button
              type="button"
              aria-label="Elegir tarjeta"
              onClick={() => setCardOpen(true)}
              className="flex w-full items-center justify-between rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 shadow-gt-xs transition hover:-translate-y-0.5"
            >
              {cardId ? (
                <PaymentChip method={cardId} size="sm" />
              ) : (
                <span className="font-gt-display text-gt-sm font-bold text-gt-ink-3">Seleccionar tarjeta</span>
              )}
              <span aria-hidden="true" className="ml-gt-8 h-2 w-2 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
            </button>
          </div>

          {/* PDF picker */}
          <div className="flex flex-col gap-gt-4">
            <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Archivo PDF</span>
            {!file ? (
              <button
                type="button"
                onClick={() => setFile(true)}
                className="flex min-h-[120px] flex-col items-center justify-center gap-gt-6 rounded-gt-xl border-2 border-dashed border-gt-line-strong bg-gt-surface px-gt-16 py-gt-16 text-center transition hover:-translate-y-0.5 hover:border-gt-primary"
              >
                <PixelIcon name="scan-statement" size={36} />
                <span className="font-gt-display text-gt-sm font-extrabold" style={{ color: VIOLET }}>Seleccionar archivo PDF</span>
                <span className="text-gt-xs font-medium text-gt-ink-3">Máximo 7 MB</span>
              </button>
            ) : (
              <div className="flex items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong px-gt-12 py-gt-10 shadow-gt-xs" style={{ backgroundColor: `${VIOLET}14` }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface">
                  <PixelIcon name="scan-statement" size={24} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{SAMPLE_STATEMENT.filename}</span>
                  <span className="text-gt-xs font-medium text-gt-ink-3">{SAMPLE_STATEMENT.fileSizeLabel}</span>
                </span>
                <button type="button" aria-label="Quitar archivo" onClick={() => setFile(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-negative shadow-gt-xs transition hover:-translate-y-0.5">
                  <PixelIcon name="action-delete" size={18} />
                </button>
              </div>
            )}
          </div>

          {/* encrypted-PDF password (optional) */}
          <label className="flex flex-col gap-gt-4">
            <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Contraseña (si está protegido)</span>
            <input
              type="password" aria-label="Contraseña del PDF"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Opcional"
              className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10 font-gt-display text-gt-sm font-bold text-gt-ink shadow-gt-xs placeholder:text-gt-ink-3 focus:border-gt-primary focus:outline-none"
            />
          </label>

          {/* mandatory AI-processing consent */}
          <button type="button" role="checkbox" aria-checked={consent} onClick={() => setConsent((c) => !c)} className="flex items-start gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 text-left shadow-gt-xs transition hover:-translate-y-0.5">
            <span className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line-strong ${consent ? "" : "bg-gt-surface"}`} style={consent ? { backgroundColor: VIOLET } : undefined}>
              {consent ? <span className="font-gt-display text-gt-sm font-extrabold leading-none text-white">✓</span> : null}
            </span>
            <span className="min-w-0 flex-1 text-gt-xs font-medium text-gt-ink-2">
              Acepto el procesamiento con IA si el lector determinista no puede leer la cartola. Aplica solo a este escaneo.
            </span>
          </button>

          {/* credit cost check — enough vs insufficient balance */}
          {enoughCredits ? (
            <div className="flex items-center justify-center gap-gt-6 rounded-gt-lg px-gt-12 py-gt-8 text-center" style={{ backgroundColor: `${VIOLET}14` }}>
              <PixelIcon name="fin-coin" size={18} />
              <span className="font-gt-display text-gt-xs font-extrabold" style={{ color: VIOLET }}>
                Se usará {SUPER_COST} de tus {superCredits} súper crédito{superCredits === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-gt-6 rounded-gt-lg border-2 border-gt-negative/40 bg-gt-negative/10 px-gt-12 py-gt-8 text-center">
              <PixelIcon name="status-warning" size={18} />
              <span className="font-gt-display text-gt-xs font-extrabold text-gt-negative">
                Sin créditos suficientes — necesitas {SUPER_COST}, tu saldo es {superCredits}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* footer — Iniciar escaneo (gated on file + consent) */}
      <div className="shrink-0 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-32 pt-gt-12">
        <Button variant="primary" size="lg" fullWidth disabled={!canScan} onClick={() => onScan?.(cardId)}>
          <PixelIcon name="scan-statement" size={24} />
          Iniciar escaneo
        </Button>
      </div>

      {/* card picker — the settled full-screen PaymentPicker (rows per card) */}
      <PaymentPicker
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        methods={cards}
        selectedId={cardId ?? ""}
        onSelect={setCardId}
        onAddCard={(card) => setCards((c) => [...c, card])}
      />

      {/* cancel-the-scan confirmation (triggered by the header X) */}
      <CancelStatementDialog open={cancelOpen} onDismiss={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); onCancel?.(); }} />
    </div>
  );
}
