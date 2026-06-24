import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { ScanCaptureScreen } from "./ScanCaptureScreen";
import { ScanProcessingScreen } from "./ScanProcessingScreen";
import { ScanReviewScreen } from "./ScanReviewScreen";
import { ScanStatementUploadScreen } from "./ScanStatementUploadScreen";
import { ScanStatementProcessingScreen } from "./ScanStatementProcessingScreen";
import { ScanStatementReconcileScreen } from "./ScanStatementReconcileScreen";
import { ScanStatementConfirmScreen } from "./ScanStatementConfirmScreen";
import { ScanStatementSuccessScreen } from "./ScanStatementSuccessScreen";
import { ScanModeChooserScreen } from "./ScanModeChooserScreen";
import type { ScanPhase } from "@lib/scanFixtures";
import type { StatementPhase } from "@lib/statementFixtures";

/**
 * Flows/Scan — the scan journeys end-to-end inside the AppSurface device frame
 * (use the platform toolbar for mobile/tablet/desktop):
 *   - Escanear: the unified front door — the mode chooser routes into either
 *     sub-flow, which returns to the chooser when done/cancelled.
 *   - SingleScan: capture → processing (auto-cycled) → review.
 *   - StatementScan: Subir → Procesar (auto-cycled) → Conciliar ⇄ Confirmar →
 *     ¡Guardada!. Conciliar/Confirmar are freely traversable (back arrow);
 *     nothing commits until "Confirmar y guardar". The header X (cancel) and
 *     "Volver al inicio" restart the journey.
 */
type Step = "capture" | "processing" | "review";

/** onExit (when provided) replaces the journey's internal reset — lets a host
 * flow (the unified Escanear journey) reclaim control on done/cancel. */
interface JourneyProps {
  onExit?: () => void;
}

function SingleScanJourney({ onExit }: JourneyProps) {
  const [step, setStep] = useState<Step>("capture");
  const [phase, setPhase] = useState<ScanPhase>("uploading");
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => clearTimers, []);

  function startScan() {
    clearTimers();
    setStep("processing");
    setPhase("uploading");
    setProgress(0);
    // uploading: ramp the progress ring, then → processing → ready → review
    [20, 55, 85, 100].forEach((p, i) => timers.current.push(setTimeout(() => setProgress(p), 200 + i * 220)));
    timers.current.push(setTimeout(() => setPhase("processing"), 1200));
    timers.current.push(setTimeout(() => setPhase("ready"), 2600));
    timers.current.push(setTimeout(() => setStep("review"), 3400));
  }

  function reset() {
    clearTimers();
    if (onExit) onExit();
    else setStep("capture");
  }

  if (step === "capture") {
    return <ScanCaptureScreen onTakePhoto={startScan} onPickFile={startScan} />;
  }
  if (step === "processing") {
    return <ScanProcessingScreen phase={phase} progress={progress} />;
  }
  return <ScanReviewScreen onSave={reset} onCancel={reset} />;
}

/** The statement (cartola) journey: Subir → Procesar → Conciliar ⇄ Confirmar → ¡Guardada! */
type StmtStep = "upload" | "processing" | "reconcile" | "confirm" | "success";

function StatementScanJourney({ onExit }: JourneyProps) {
  const [step, setStep] = useState<StmtStep>("upload");
  const [phase, setPhase] = useState<StatementPhase>("uploading");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => clearTimers, []);

  function startScan() {
    clearTimers();
    setStep("processing");
    setPhase("uploading");
    // auto-advance the streaming stages, then open Conciliar
    timers.current.push(setTimeout(() => setPhase("queued"), 700));
    timers.current.push(setTimeout(() => setPhase("extracting"), 1500));
    timers.current.push(setTimeout(() => setPhase("reconciling"), 2400));
    timers.current.push(setTimeout(() => setStep("reconcile"), 3300));
  }

  function reset() {
    clearTimers();
    if (onExit) onExit();
    else setStep("upload");
  }

  if (step === "upload") {
    // initialFile so "Iniciar escaneo" is reachable (tick the AI-consent box, then scan)
    return <ScanStatementUploadScreen initialFile onScan={startScan} onCancel={reset} />;
  }
  if (step === "processing") {
    return <ScanStatementProcessingScreen phase={phase} onCancel={reset} />;
  }
  if (step === "reconcile") {
    return <ScanStatementReconcileScreen onContinue={() => setStep("confirm")} onBack={reset} onCancel={reset} />;
  }
  if (step === "confirm") {
    return <ScanStatementConfirmScreen onConfirm={() => setStep("success")} onBack={() => setStep("reconcile")} onCancel={reset} />;
  }
  return <ScanStatementSuccessScreen onHome={reset} onViewTransactions={reset} />;
}

/** The unified front door: the mode chooser routes into a sub-flow; each
 * sub-flow returns here when done or cancelled. (Manual entry isn't built yet.) */
type Mode = "chooser" | "single" | "statement";

function EscanearJourney() {
  const [mode, setMode] = useState<Mode>("chooser");
  const toChooser = () => setMode("chooser");

  if (mode === "single") return <SingleScanJourney onExit={toChooser} />;
  if (mode === "statement") return <StatementScanJourney onExit={toChooser} />;
  return (
    <ScanModeChooserScreen
      onSingle={() => setMode("single")}
      onStatement={() => setMode("statement")}
      onClose={toChooser}
    />
  );
}

const meta: Meta = {
  title: "Flows/Scan",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

/** The unified scan entry. Pick a mode → run that sub-flow → return to the chooser. */
export const Scan: Story = {
  render: (_args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <EscanearJourney />
    </AppSurface>
  ),
};

/** Single scan, end to end. Tap a capture button to run the journey. */
export const SingleScan: Story = {
  render: (_args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <SingleScanJourney />
    </AppSurface>
  ),
};

/** Statement (cartola) scan, end to end. Tick the AI-consent box → "Iniciar escaneo" to run the journey. */
export const StatementScan: Story = {
  render: (_args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <StatementScanJourney />
    </AppSurface>
  ),
};
