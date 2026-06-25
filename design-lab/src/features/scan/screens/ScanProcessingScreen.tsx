import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CircularProgress } from "@design-system/atoms/CircularProgress";
import { Button } from "@design-system/atoms/Button";
import type { ScanPhase } from "@lib/scanFixtures";

/**
 * ScanProcessingScreen (DM-42) — simple-scan screen 2. The work-in-progress
 * screen between capture and review, faithful to legacy BoletApp's three stages:
 *   uploading  → circular progress ring (%) + "Subiendo…"
 *   processing → spinner + "Procesando boleta…" + ~ETA
 *   ready      → success checkmark + "¡Listo!" + "Abriendo resultado…"
 * A full-bleed flex column that fills the AppSurface frame. `phase` drives the
 * stage (story toggles it); `progress` is the upload % (0–100). The "navigable"
 * hint mirrors legacy's non-blocking processing.
 */
export interface ScanProcessingScreenProps {
  phase?: ScanPhase;
  /** upload progress 0–100 (uploading phase only). */
  progress?: number;
  /** ETA label (processing phase). */
  eta?: string;
  /** why a `failed` phase failed — a read error vs no scan credits. */
  failReason?: "read" | "credits";
  onRetry?: () => void;
  onUpgrade?: () => void;
  onCancel?: () => void;
}

export function ScanProcessingScreen({ phase = "uploading", progress = 45, eta = "~5 segundos", failReason = "read", onRetry, onUpgrade, onCancel }: ScanProcessingScreenProps) {
  const noCredits = failReason === "credits";
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg px-gt-24 text-center">
      {/* centered stage content fills the available height */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-gt-16">
      {phase === "uploading" ? (
        <>
          <CircularProgress percent={progress} size={96} strokeWidth={6} color="var(--primary)" />
          <p className="font-gt-display text-gt-xl font-extrabold text-gt-ink">Subiendo…</p>
        </>
      ) : phase === "processing" ? (
        <>
          <span className="relative grid h-24 w-24 place-items-center">
            <span
              className="absolute h-24 w-24 animate-spin rounded-gt-pill border-[6px] border-t-[6px]"
              style={{ borderColor: "var(--border-light)", borderTopColor: "var(--primary)" }}
            />
            <PixelIcon name="scan-processing" size={40} />
          </span>
          <p className="font-gt-display text-gt-xl font-extrabold text-gt-ink">Procesando boleta…</p>
          <p className="text-gt-sm font-bold text-gt-ink-3">{eta}</p>
        </>
      ) : phase === "failed" ? (
        <>
          <span className={`grid h-24 w-24 place-items-center rounded-gt-pill border-2 border-gt-line-strong shadow-gt-sm ${noCredits ? "bg-gt-primary-soft" : "bg-gt-negative-bg"}`}>
            <PixelIcon name={noCredits ? "fin-coin" : "scan-error"} size={48} />
          </span>
          <div>
            <p className="font-gt-display text-gt-2xl font-extrabold text-gt-ink">{noCredits ? "Sin créditos de escaneo" : "No pudimos leer la boleta"}</p>
            <p className="pt-gt-2 text-gt-sm font-medium text-gt-ink-2">
              {noCredits ? "Te quedaste sin créditos este mes. Mejora a Pro para seguir escaneando." : "La imagen está borrosa o incompleta. Intenta con otra foto."}
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-gt-8">
            {noCredits ? (
              <Button variant="primary" fullWidth onClick={onUpgrade}><PixelIcon name="credit-super" size={20} /> Mejorar a Pro</Button>
            ) : (
              <Button variant="primary" fullWidth onClick={onRetry}><PixelIcon name="scan-retry" size={20} /> Reintentar</Button>
            )}
            <Button variant="ghost" fullWidth onClick={onCancel}>Cancelar</Button>
          </div>
        </>
      ) : (
        <>
          <span className="grid h-24 w-24 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-positive-bg shadow-gt-sm">
            <PixelIcon name="scan-success" size={48} />
          </span>
          <p className="font-gt-display text-gt-2xl font-extrabold text-gt-positive">¡Listo!</p>
          <p className="text-gt-sm font-medium italic text-gt-ink-3">Abriendo resultado…</p>
        </>
      )}
      </div>

      {/* non-blocking hint (legacy parity), bottom-pinned — only while in progress */}
      {phase === "uploading" || phase === "processing" ? (
        <p className="shrink-0 pb-gt-32 text-center text-gt-xs font-medium text-gt-ink-3">
          Puedes seguir navegando mientras procesamos.
        </p>
      ) : null}
    </div>
  );
}
