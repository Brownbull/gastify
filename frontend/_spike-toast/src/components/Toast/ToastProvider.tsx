/**
 * ToastProvider — system layer.
 *
 * Owns the visible toast queue. Max 3 concurrent; a 4th push evicts the
 * oldest (FIFO). Auto-dismiss timers live INSIDE each <Toast> instance
 * (not here) — the provider only holds entries; <Toast> calls back via
 * onDismiss when its timer fires (or the user clicks close).
 */
import { createContext, useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { ToastEntry, ToastType } from "./Toast.types";

const MAX_VISIBLE = 3;

interface ToastContextValue {
  queue: readonly ToastEntry[];
  push: (
    type: ToastType,
    message: string,
    options?: { title?: string; duration?: number },
  ) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<readonly ToastEntry[]>([]);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const push = useCallback<ToastContextValue["push"]>(
    (type, message, options) => {
      const id = crypto.randomUUID();
      const entry: ToastEntry = {
        id,
        type,
        title: options?.title,
        message,
        duration: options?.duration ?? defaultDurationFor(type),
        onDismiss: dismiss,
        createdAt: Date.now(),
      };
      setQueue((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });
      return id;
    },
    [dismiss],
  );

  const value: ToastContextValue = { queue, push, dismiss };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

function defaultDurationFor(type: ToastType): number {
  // Mirrors mockup contract: success/info auto-dismiss fast, warning slower,
  // error sticks until user dismisses. See ../../../../docs/mockups/molecules/toast.html "Composition".
  switch (type) {
    case "success":
    case "info":
      return 5000;
    case "warning":
      return 8000;
    case "error":
      return 0;
  }
}
