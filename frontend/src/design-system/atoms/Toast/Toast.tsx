import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';

type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface ToastProps {
  variant: ToastVariant;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle; bg: string; border: string; text: string }
> = {
  success: {
    icon: CheckCircle,
    bg: 'var(--positive-bg, rgba(34, 197, 94, 0.1))',
    border: 'var(--positive)',
    text: 'var(--positive)',
  },
  info: {
    icon: Info,
    bg: 'var(--info-bg, rgba(59, 130, 246, 0.1))',
    border: 'var(--info)',
    text: 'var(--info)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'var(--warning-bg, rgba(245, 158, 11, 0.1))',
    border: 'var(--warning)',
    text: 'var(--warning)',
  },
  error: {
    icon: XCircle,
    bg: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
    border: 'var(--error)',
    text: 'var(--error)',
  },
};

export function Toast({ variant, message, onDismiss, className = '' }: ToastProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
      role="alert"
    >
      <Icon size={20} style={{ color: config.text, flexShrink: 0 }} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {message}
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center justify-center rounded-lg p-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
