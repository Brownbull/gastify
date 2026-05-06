import { Toast } from '../../atoms/Toast';

interface ToastItem {
  readonly id: string;
  readonly variant: 'success' | 'info' | 'warning' | 'error';
  readonly message: string;
}

interface ToastSystemProps {
  toasts: readonly ToastItem[];
  onDismiss: (id: string) => void;
}

const MAX_VISIBLE = 3;

export function ToastSystem({ toasts, onDismiss }: ToastSystemProps) {
  const visible = toasts.slice(0, MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2"
      style={{ width: '360px', maxWidth: 'calc(100vw - 32px)' }}
      aria-live="polite"
      aria-label="Notificaciones"
    >
      {visible.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
