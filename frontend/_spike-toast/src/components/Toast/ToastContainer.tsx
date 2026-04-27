/**
 * ToastContainer — renders the active queue from ToastProvider into the
 * canonical `.toast-stack` element. Mounted once at the App root so it's
 * always available.
 */
import { useContext } from "react";
import { Toast } from "./Toast";
import { ToastContext } from "./ToastProvider";

export function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("ToastContainer must be rendered inside <ToastProvider>.");
  }
  return (
    <div className="toast-stack" aria-live="polite">
      {ctx.queue.map((entry) => (
        <Toast
          key={entry.id}
          id={entry.id}
          type={entry.type}
          title={entry.title}
          message={entry.message}
          duration={entry.duration}
          onDismiss={ctx.dismiss}
        />
      ))}
    </div>
  );
}
