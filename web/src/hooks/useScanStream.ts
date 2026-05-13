import { useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { useScanStore, type ScanEvent } from "@/stores/scanStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const TERMINAL_STEPS = new Set(["complete", "failed"]);

function backoffDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}

export function useScanStream() {
  const scanId = useScanStore((s) => s.scanId);
  const phase = useScanStore((s) => s.phase);
  const receiveEvent = useScanStore((s) => s.receiveEvent);

  const retriesRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!scanId || phase === "idle" || phase === "uploading") return;
    if (phase === "complete" || phase === "failed") return;

    let cancelled = false;

    async function connect() {
      const user = auth.currentUser;
      if (!user || cancelled) return;

      let token: string;
      try {
        token = await user.getIdToken();
      } catch {
        if (!cancelled) {
          useScanStore.getState().receiveEvent({
            event_type: "error",
            scan_id: scanId!,
            step: "failed",
            progress_pct: 0,
            error: { code: "auth_error", message: "Failed to refresh auth token" },
          });
        }
        return;
      }

      if (cancelled) return;

      const url = `${API_BASE}/api/v1/scans/${scanId}/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      sourceRef.current = es;

      es.onopen = () => {
        retriesRef.current = 0;
      };

      es.onmessage = (msg) => {
        if (cancelled) return;
        try {
          const event: ScanEvent = JSON.parse(msg.data);
          receiveEvent(event);

          if (TERMINAL_STEPS.has(event.step)) {
            es.close();
            sourceRef.current = null;
          }
        } catch {
          // malformed event — ignore
        }
      };

      const EVENT_TYPES = [
        "submitted",
        "processing",
        "extracting",
        "categorizing",
        "verified",
        "complete",
        "failed",
        "error",
      ];

      for (const eventType of EVENT_TYPES) {
        es.addEventListener(eventType, (msg: MessageEvent) => {
          if (cancelled) return;
          try {
            const event: ScanEvent = JSON.parse(msg.data);
            receiveEvent(event);

            if (TERMINAL_STEPS.has(event.step) || eventType === "complete" || eventType === "failed") {
              es.close();
              sourceRef.current = null;
            }
          } catch {
            // malformed event — ignore
          }
        });
      }

      es.onerror = () => {
        es.close();
        sourceRef.current = null;

        if (cancelled) return;

        const currentPhase = useScanStore.getState().phase;
        if (currentPhase === "complete" || currentPhase === "failed") return;

        if (retriesRef.current >= MAX_RETRIES) {
          useScanStore.getState().receiveEvent({
            event_type: "error",
            scan_id: scanId!,
            step: "failed",
            progress_pct: 0,
            error: {
              code: "connection_lost",
              message: "Lost connection to scan progress. Please try again.",
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
  }, [scanId, phase, receiveEvent]);
}
