import { useEffect } from "react";
import {
  ScanProgressSocket,
} from "../lib/scanProgressSocket";
import { getFreshFirebaseIdToken } from "../lib/scanUpload";
import { useScanStore, type ScanPhase } from "../stores/scanStore";

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

    const controller = new ScanProgressSocket({
      scanId,
      tokenProvider: getFreshFirebaseIdToken,
      onEvent: receiveEvent,
      onFatalError: failScan,
      onStatusChange: setConnectionStatus,
    });

    controller.start();

    return () => {
      controller.stop();
    };
  }, [failScan, receiveEvent, scanId, setConnectionStatus, shouldStream]);
}
