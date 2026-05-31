import { useEffect } from "react";
import { ScanProgressSocket } from "../lib/scanProgressSocket";
import { ProgressFallback } from "../lib/progressFallback";
import { applyScanStatus } from "../lib/scanProgressFallback";
import { getScan } from "../lib/scans";
import { getFreshFirebaseIdToken } from "../lib/scanUpload";
import { useScanStore, type ScanEvent, type ScanPhase } from "../stores/scanStore";

const STREAMING_PHASES = new Set<ScanPhase>([
  "submitted",
  "processing",
  "extracting",
  "categorizing",
  "verified",
]);

export function useScanProgressSocket() {
  const scanId = useScanStore((state) => state.scanId);
  const phase = useScanStore((state) => state.phase);
  const receiveEvent = useScanStore((state) => state.receiveEvent);
  const failScan = useScanStore((state) => state.failScan);
  const setConnectionStatus = useScanStore(
    (state) => state.setConnectionStatus,
  );
  const shouldStream = scanId != null && STREAMING_PHASES.has(phase);

  useEffect(() => {
    if (!scanId || !shouldStream) return;

    // HYBRID transport (ADR D62 Path A): the WebSocket stays primary; the REST poll
    // fallback engages only while the WS is in distress (or stalled) and yields the
    // instant the WS reconnects. It also reconciles once on app-foreground.
    const fallback = new ProgressFallback({
      fetchOnce: (signal) => getScan(scanId, signal),
      apply: applyScanStatus,
    });

    const controller = new ScanProgressSocket({
      scanId,
      tokenProvider: getFreshFirebaseIdToken,
      onEvent: (event: ScanEvent) => {
        receiveEvent(event);
        fallback.noteWsActivity();
      },
      onFatalError: failScan,
      onStatusChange: (status, options) => {
        setConnectionStatus(status, options);
        fallback.noteWsStatus(status);
      },
    });

    controller.start();
    fallback.start();

    return () => {
      fallback.stop();
      controller.stop();
    };
  }, [failScan, receiveEvent, scanId, setConnectionStatus, shouldStream]);
}
