import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: string;
  onRetry: () => void;
  onGoHome: () => void;
}

export function ErrorFallback({ error, onRetry, onGoHome }: ErrorFallbackProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
      role="alert"
    >
      <div
        className="flex items-center justify-center rounded-full p-4"
        style={{ backgroundColor: 'var(--error-bg, rgba(239, 68, 68, 0.1))' }}
      >
        <AlertCircle size={40} style={{ color: 'var(--error)' }} aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h2>
        <p
          className="text-sm max-w-md"
          style={{ color: 'var(--text-secondary)' }}
        >
          {error}
        </p>
      </div>

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Reintentar
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)',
          }}
        >
          <Home size={16} aria-hidden="true" />
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
