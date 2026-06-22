import { Modal } from "@design-system/atoms/Modal";

/**
 * CancelStatementDialog (DM-43) — the "are you sure?" confirmation shown when
 * the user taps the X on any statement-scan screen. The statement flow can be
 * abandoned at any step; confirming discards the in-progress scan.
 *
 *   - onDismiss → "No, seguir" (close the dialog, stay in the flow)
 *   - onConfirm → "Sí, cancelar" (abort the scan)
 */
export interface CancelStatementDialogProps {
  open: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

export function CancelStatementDialog({ open, onDismiss, onConfirm }: CancelStatementDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onDismiss}
      title="¿Cancelar escaneo?"
      footer={
        <div className="grid grid-cols-2 gap-gt-8">
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center justify-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 font-gt-display text-gt-base font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5"
          >
            No, seguir
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center justify-center rounded-gt-lg border-2 border-gt-line-strong px-gt-12 py-gt-8 font-gt-display text-gt-base font-extrabold text-white shadow-gt-xs transition hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--negative-primary)" }}
          >
            Sí, cancelar
          </button>
        </div>
      }
    >
      <p className="text-gt-sm font-medium text-gt-ink-2">
        Se perderá el progreso de este escaneo. Esta acción no se puede deshacer.
      </p>
    </Modal>
  );
}
