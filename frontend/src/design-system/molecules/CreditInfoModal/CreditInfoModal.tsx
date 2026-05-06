import { X, AlertTriangle, Coins } from 'lucide-react';

interface CreditInfoModalProps {
  open: boolean;
  credits: number;
  onClose: () => void;
  onPurchase: () => void;
}

const MAX_CREDITS = 100;

export function CreditInfoModal({ open, credits, onClose, onPurchase }: CreditInfoModalProps) {
  if (!open) return null;

  const percentage = Math.min((credits / MAX_CREDITS) * 100, 100);
  const isZero = credits === 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Informacion de creditos"
    >
      <div
        className="relative flex flex-col items-center gap-4 w-full max-w-sm p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        <button
          type="button"
          className="absolute top-3 right-3 p-1 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="relative flex items-center justify-center w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={isZero ? 'var(--error)' : 'var(--primary)'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <span
            className="absolute text-2xl font-bold"
            style={{ color: isZero ? 'var(--error)' : 'var(--text-primary)' }}
          >
            {credits}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-1.5">
            <Coins size={16} aria-hidden="true" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Creditos disponibles
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {credits} de {MAX_CREDITS} creditos
          </span>
        </div>

        {isZero && (
          <div
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--error)', color: '#ffffff' }}
            role="alert"
          >
            <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
            No tienes creditos. Compra mas para seguir escaneando.
          </div>
        )}

        <button
          type="button"
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
          onClick={onPurchase}
        >
          Comprar creditos
        </button>
      </div>
    </div>
  );
}
