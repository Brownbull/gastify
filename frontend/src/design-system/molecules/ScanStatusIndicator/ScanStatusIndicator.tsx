import { Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';

type ScanStatus = 'idle' | 'processing' | 'complete' | 'error';

interface ScanStatusIndicatorProps {
  status: ScanStatus;
  className?: string;
}

const STATUS_CONFIG: Record<ScanStatus, { icon: typeof Clock; label: string; color: string }> = {
  idle: { icon: Clock, label: 'Pendiente', color: 'var(--text-tertiary)' },
  processing: { icon: Loader2, label: 'Procesando', color: 'var(--primary)' },
  complete: { icon: CheckCircle, label: 'Completado', color: 'var(--positive)' },
  error: { icon: XCircle, label: 'Error', color: 'var(--error)' },
};

export function ScanStatusIndicator({ status, className = '' }: ScanStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={['inline-flex items-center gap-1.5 text-xs font-medium', className]
        .filter(Boolean)
        .join(' ')}
      style={{ color: config.color }}
    >
      <Icon size={14} className={status === 'processing' ? 'animate-spin' : ''} aria-hidden="true" />
      {config.label}
    </span>
  );
}
