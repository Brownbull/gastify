import { RefreshCw, X } from 'lucide-react';

interface PWAUpdatePromptProps {
  onRefresh: () => void;
  onDismiss: () => void;
  className?: string;
}

export function PWAUpdatePrompt({ onRefresh, onDismiss, className = '' }: PWAUpdatePromptProps) {
  return (
    <div
      className={['flex items-center gap-3 px-4 py-3 rounded-xl', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--info)', color: '#ffffff' }}
      role="alert"
      aria-label="Actualizacion disponible"
    >
      <RefreshCw size={18} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 text-sm font-medium">
        Nueva version disponible
      </span>
      <button
        type="button"
        className="px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
        onClick={onRefresh}
        aria-label="Actualizar ahora"
      >
        Actualizar
      </button>
      <button
        type="button"
        className="p-1 rounded-lg transition-opacity hover:opacity-70"
        style={{ color: '#ffffff' }}
        onClick={onDismiss}
        aria-label="Descartar actualizacion"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
