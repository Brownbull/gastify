/**
 * Toast — leaf React component.
 *
 * Mirrors the DOM of the canonical static mockup so the existing variant
 * CSS rules (in assets/css/molecules.css) apply unchanged. Variant is
 * dispatched via `is-{type}` className (the same convention used in the HTML
 * mockup), not data-attribute.
 *
 * @see ../../../../docs/mockups/molecules/toast.html (canonical mockup)
 * @see ../../../../docs/mockups/molecules/COMPONENT-LIBRARY.md (state matrix)
 */
import { useEffect, useRef, useState } from "react";
import type { ToastProps } from "./Toast.types";
import "./Toast.css";

export function Toast(props: ToastProps) {
  const { id, type, title, message, onDismiss, duration = 5000 } = props;
  const [isDismissing, setIsDismissing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const startTimer = () => {
    if (duration <= 0) return;
    timerRef.current = window.setTimeout(() => setIsDismissing(true), duration);
  };
  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return clearTimer;
    // duration is a primitive — re-run only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  useEffect(() => {
    if (!isDismissing) return;
    const fadeOut = window.setTimeout(() => onDismiss(id), 200);
    return () => window.clearTimeout(fadeOut);
  }, [isDismissing, id, onDismiss]);

  const ariaRole = type === "error" ? "alert" : "status";

  return (
    <div
      className={`toast is-${type}${isDismissing ? " is-dismissing" : ""}`}
      role={ariaRole}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      <div className="toast-icon" aria-hidden="true">
        {iconFor(type)}
      </div>
      <div className="toast-body">
        {title ? <p className="toast-title">{title}</p> : null}
        <p className="toast-message">{message}</p>
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label="Cerrar"
        onClick={() => setIsDismissing(true)}
      >
        ×
      </button>
    </div>
  );
}

function iconFor(type: ToastProps["type"]) {
  switch (type) {
    case "success":
      return "✓";
    case "info":
      return "i";
    case "warning":
      return "!";
    case "error":
      return "×";
  }
}
