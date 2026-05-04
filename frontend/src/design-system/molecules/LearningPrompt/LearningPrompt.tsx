import { Check, X, Brain } from 'lucide-react';

interface LearningPromptProps {
  merchant: string;
  suggestedCategory: string;
  confidence: number;
  onAccept: () => void;
  onReject: () => void;
  alwaysLearn: boolean;
  onAlwaysLearnChange: (value: boolean) => void;
  className?: string;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'var(--positive)';
  if (confidence >= 50) return 'var(--warning)';
  return 'var(--error)';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'Alta';
  if (confidence >= 50) return 'Media';
  return 'Baja';
}

export function LearningPrompt({
  merchant,
  suggestedCategory,
  confidence,
  onAccept,
  onReject,
  alwaysLearn,
  onAlwaysLearnChange,
  className = '',
}: LearningPromptProps) {
  const clampedConfidence = Math.max(0, Math.min(100, confidence));
  const confidenceColor = getConfidenceColor(clampedConfidence);

  return (
    <div
      className={['flex flex-col gap-3 p-4 rounded-xl', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      role="region"
      aria-label="Sugerencia de categoria"
    >
      <div className="flex items-center gap-2">
        <Brain size={18} aria-hidden="true" style={{ color: 'var(--primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Sugerencia de IA
        </span>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{merchant}</span>
        {' '}parece ser{' '}
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{suggestedCategory}</span>
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Confianza
          </span>
          <span className="text-xs font-medium" style={{ color: confidenceColor }}>
            {clampedConfidence}% - {getConfidenceLabel(clampedConfidence)}
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--surface)' }}
          role="progressbar"
          aria-valuenow={clampedConfidence}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Nivel de confianza"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${clampedConfidence}%`,
              backgroundColor: confidenceColor,
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--positive)', color: '#ffffff' }}
          onClick={onAccept}
          aria-label="Aceptar sugerencia"
        >
          <Check size={16} aria-hidden="true" />
          Aceptar
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          onClick={onReject}
          aria-label="Rechazar sugerencia"
        >
          <X size={16} aria-hidden="true" />
          Rechazar
        </button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={alwaysLearn}
          onChange={(e) => onAlwaysLearnChange(e.target.checked)}
          className="w-4 h-4 rounded"
          aria-label="Siempre aprender de mis correcciones"
        />
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Siempre aprender de mis correcciones
        </span>
      </label>
    </div>
  );
}
