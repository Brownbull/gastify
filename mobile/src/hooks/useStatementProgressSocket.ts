import { useEffect } from "react";
import { getFreshFirebaseIdToken } from "../lib/scanUpload";
import { StatementProgressSocket } from "../lib/statementProgressSocket";
import {
  useStatementStore,
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

    const controller = new StatementProgressSocket({
      statementId,
      tokenProvider: getFreshFirebaseIdToken,
      onEvent: receiveEvent,
      onFatalError: uploadFailed,
      onStatusChange: setConnectionStatus,
    });

    controller.start();

    return () => {
      controller.stop();
    };
  }, [receiveEvent, setConnectionStatus, shouldStream, statementId, uploadFailed]);
}
