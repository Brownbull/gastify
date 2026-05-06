import * as React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

type ConfirmationVariant = 'default' | 'danger';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmationVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onCancel}
        data-testid="confirmation-backdrop"
        aria-hidden="true"
      />

      {/* Card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby="confirmation-message"
        className="relative rounded-2xl shadow-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          width: '90%',
          maxWidth: '420px',
        }}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          {isDanger && (
            <div
              className="flex items-center justify-center rounded-full p-2 mt-0.5"
              style={{ backgroundColor: 'var(--error-bg, rgba(239, 68, 68, 0.1))' }}
            >
              <AlertTriangle size={20} style={{ color: 'var(--error)' }} aria-hidden="true" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <p
              id="confirmation-message"
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--surface)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-colors hover:opacity-90"
            style={{
              backgroundColor: isDanger ? 'var(--error)' : 'var(--primary)',
              color: '#ffffff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
