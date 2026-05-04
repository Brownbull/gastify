import { Info, AlertTriangle, XCircle, WifiOff, X } from 'lucide-react';

type BannerVariant = 'info' | 'warning' | 'error' | 'offline';

interface BannerProps {
  variant: BannerVariant;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIG: Record<BannerVariant, { icon: typeof Info; bg: string; text: string; border: string }> = {
  info: { icon: Info, bg: 'var(--info-bg, rgba(59,130,246,0.1))', text: 'var(--info)', border: 'var(--info)' },
  warning: { icon: AlertTriangle, bg: 'var(--warning-bg, rgba(245,158,11,0.1))', text: 'var(--warning)', border: 'var(--warning)' },
  error: { icon: XCircle, bg: 'var(--error-bg, rgba(239,68,68,0.1))', text: 'var(--error)', border: 'var(--error)' },
  offline: { icon: WifiOff, bg: 'var(--text-primary)', text: '#ffffff', border: 'var(--text-primary)' },
};

export function Banner({ variant, message, onDismiss, className = '' }: BannerProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={['flex items-center gap-3 px-4 py-2.5 w-full', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: config.bg, borderBottom: `1px solid ${config.border}` }}
      role="alert"
    >
      <Icon size={18} style={{ color: config.text, flexShrink: 0 }} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium" style={{ color: variant === 'offline' ? '#ffffff' : 'var(--text-primary)' }}>
        {message}
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded transition-opacity hover:opacity-70"
          style={{ color: config.text }}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
