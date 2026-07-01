import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/shell/icons";

/**
 * Modal — reusable popup surface (DM-10). Dimmed backdrop + a centered (or
 * bottom-sheet) geometric panel: 2px ink border, hard shadow, optional title +
 * close X. Esc and backdrop click close it.
 *
 * The backdrop covers the whole app SURFACE, not just the box it's declared in:
 * it PORTALS into the content-pane wrapper (`[data-testid=app-content-pane]`, the
 * non-scrolling `relative flex-1` sibling of the SideNav) and positions
 * `fixed inset-0 lg:absolute` — so it dims the entire viewport on mobile and the
 * entire content pane (SideNav excluded, collapse-aware) on desktop. Falls back to
 * document.body when there's no app shell.
 *
 * Vendored from design-lab/src/design-system/atoms/Modal.tsx (D102); the portal +
 * pane-aware positioning are web additions on top of the design-lab surface.
 */
export type ModalPlacement = "center" | "sheet";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** accessible name for the dialog when there is no visible `title` (role=dialog needs a name). */
  ariaLabel?: string;
  placement?: ModalPlacement;
  children: ReactNode;
  /** footer actions row (optional). */
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, ariaLabel, placement = "center", children, footer, className = "" }: ModalProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // The portal target is a post-mount DOM lookup (the content-pane wrapper isn't
    // available during render), so it must be resolved from an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMount((document.querySelector("[data-testid='app-content-pane']") as HTMLElement | null) ?? document.body);
  }, [open]);

  // Move focus into the dialog on open + restore it to the trigger on close (WCAG
  // 2.4.3). Keyed on `mount` so focus lands after the portal has rendered the panel.
  useEffect(() => {
    if (!open || !mount) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open, mount]);

  if (!open || !mount) return null;

  const panelPos =
    placement === "sheet"
      ? "absolute inset-x-0 bottom-0 rounded-t-gt-2xl border-x-0 border-b-0"
      : "m-gt-16 rounded-gt-2xl";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center lg:absolute"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
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
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[90%] w-full max-w-sm flex-col border-2 border-gt-line-strong bg-gt-surface shadow-gt-xl outline-none ${panelPos} ${className}`}
      >
        {title ? (
          <header className="flex items-center justify-between gap-gt-8 border-b-2 border-gt-line px-gt-16 py-gt-12">
            <h3 id={titleId} className="text-gt-lg font-extrabold text-gt-ink">{title}</h3>
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
    </div>,
    mount,
  );
}
