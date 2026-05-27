import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { statementKeys } from "@/hooks/useStatements";
import {
  useStatementStore,
  type StatementEvent,
} from "@/stores/statementStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const TERMINAL_EVENT_TYPES = new Set([
  "statement_completed",
  "statement_failed",
  "statement_password_required",
  "statement_password_invalid",
]);

const EVENT_TYPES = [
  "statement_picked_up",
  "statement_llm_start",
  "statement_llm_end",
  "statement_reconciling",
  "statement_completed",
  "statement_failed",
  "statement_password_required",
  "statement_password_invalid",
];

function backoffDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}

export function useStatementStream() {
  const queryClient = useQueryClient();
  const statementId = useStatementStore((s) => s.statement?.id ?? null);
  const phase = useStatementStore((s) => s.phase);
  const receiveEvent = useStatementStore((s) => s.receiveEvent);

  const retriesRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!statementId) return;
    if (phase === "idle" || phase === "uploading") return;
    if (
      phase === "completed" ||
      phase === "failed" ||
      phase === "password_required" ||
      phase === "password_invalid"
    ) {
      return;
    }

    let cancelled = false;

    async function connect() {
      const user = auth.currentUser;
      if (!user || cancelled) return;

      let token: string;
      try {
        token = await user.getIdToken();
      } catch {
        if (!cancelled) {
          useStatementStore.getState().receiveEvent({
            event_type: "statement_failed",
            statement_id: statementId!,
            step: "failed",
            progress_pct: 0,
            error: {
              code: "auth_error",
              message: "Failed to refresh auth token",
            },
          });
        }
        return;
      }

      if (cancelled) return;

      const url = `${API_BASE}/api/v1/statements/${statementId}/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      sourceRef.current = es;

      es.onopen = () => {
        retriesRef.current = 0;
      };

      const handleEvent = (msg: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const event = JSON.parse(msg.data) as StatementEvent;
          receiveEvent(event);

          if (TERMINAL_EVENT_TYPES.has(event.event_type)) {
            es.close();
            sourceRef.current = null;
            void queryClient.invalidateQueries({
              queryKey: statementKeys.lists(),
            });
            void queryClient.invalidateQueries({
              queryKey: statementKeys.reconciliation(statementId!),
            });
            void queryClient.invalidateQueries({
              queryKey: statementKeys.lines(statementId!),
            });
          }
        } catch {
          // malformed event; ignore
        }
      };

      es.onmessage = handleEvent;
      for (const eventType of EVENT_TYPES) {
        es.addEventListener(eventType, handleEvent);
      }

      es.onerror = () => {
        es.close();
        sourceRef.current = null;

        if (cancelled) return;

        const currentPhase = useStatementStore.getState().phase;
        if (
          currentPhase === "completed" ||
          currentPhase === "failed" ||
          currentPhase === "password_required" ||
          currentPhase === "password_invalid"
        ) {
          return;
        }

        if (retriesRef.current >= MAX_RETRIES) {
          useStatementStore.getState().receiveEvent({
            event_type: "statement_failed",
            statement_id: statementId!,
            step: "failed",
            progress_pct: 0,
            error: {
              code: "connection_lost",
              message: "Lost connection to statement progress. Please try again.",
            },
          });
          return;
        }

        const delay = backoffDelay(retriesRef.current);
        retriesRef.current += 1;
        timerRef.current = setTimeout(() => {
          if (!cancelled) void connect();
        }, delay);
      };
    }

    void connect();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      sourceRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [statementId, phase, receiveEvent, queryClient]);
}
