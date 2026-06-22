import { useEffect, type ReactNode } from "react";
import { XIcon } from "@design-system/assets/icons";

/**
 * Modal — reusable popup surface (DM-10). Dimmed backdrop + a centered (or
 * bottom-sheet) geometric panel: 2px ink border, hard shadow, optional title +
 * close X. Esc and backdrop click close it. Built for the payment picker /
 * add-card flows and any future dialog.
 *
 * Presentational: render conditionally (`{open && <Modal .../>}`) or pass
 * `open`; closing is the caller's concern via `onClose`.
 */
export type ModalPlacement = "center" | "sheet";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  placement?: ModalPlacement;
  children: ReactNode;
  /** footer actions row (optional). */
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, placement = "center", children, footer, className = "" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panelPos =
    placement === "sheet"
      ? "absolute inset-x-0 bottom-0 rounded-t-gt-2xl border-x-0 border-b-0"
      : "rounded-gt-2xl";

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-gt-ink/40"
      />
      {/* panel */}
      <div
        className={`relative z-10 flex max-h-[90%] w-full max-w-sm flex-col border-2 border-gt-line-strong bg-gt-surface shadow-gt-xl ${panelPos} ${className}`}
      >
        {title ? (
          <header className="flex items-center justify-between gap-gt-8 border-b-2 border-gt-line px-gt-16 py-gt-12">
            <h3 className="text-gt-lg font-extrabold text-gt-ink">{title}</h3>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-md text-gt-ink-2 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </header>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-gt-16">{children}</div>
        {footer ? <footer className="border-t-2 border-gt-line p-gt-16">{footer}</footer> : null}
      </div>
    </div>
  );
}
