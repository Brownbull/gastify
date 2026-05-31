import { useEffect } from "react";
import { getFreshFirebaseIdToken } from "../lib/scanUpload";
import { StatementProgressSocket } from "../lib/statementProgressSocket";
import { ProgressFallback } from "../lib/progressFallback";
import { applyStatementStatus } from "../lib/statementProgressFallback";
import { getStatement } from "../lib/statements";
import {
  useStatementStore,
  type StatementEvent,
  type StatementPhase,
} from "../stores/statementStore";

const STREAMING_PHASES = new Set<StatementPhase>([
  "queued",
  "extracting",
  "reconciling",
]);

export function useStatementProgressSocket() {
  const statementId = useStatementStore((state) => state.statementId);
  const phase = useStatementStore((state) => state.phase);
  const receiveEvent = useStatementStore((state) => state.receiveEvent);
  const uploadFailed = useStatementStore((state) => state.uploadFailed);
  const setConnectionStatus = useStatementStore(
    (state) => state.setConnectionStatus,
  );
  const shouldStream = statementId != null && STREAMING_PHASES.has(phase);

  useEffect(() => {
    if (!statementId || !shouldStream) return;

    // HYBRID transport (ADR D62 Path A): WebSocket primary, REST poll fallback engages
    // only while the WS is in distress / stalled, plus a foreground reconcile.
    const fallback = new ProgressFallback({
      fetchOnce: (signal) => getStatement(statementId, signal),
      apply: applyStatementStatus,
    });

    const controller = new StatementProgressSocket({
      statementId,
      tokenProvider: getFreshFirebaseIdToken,
      onEvent: (event: StatementEvent) => {
        receiveEvent(event);
        fallback.noteWsActivity();
      },
      onFatalError: uploadFailed,
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
  }, [receiveEvent, setConnectionStatus, shouldStream, statementId, uploadFailed]);
}
