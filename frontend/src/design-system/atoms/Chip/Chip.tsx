import { Check, X } from 'lucide-react';

type ChipVariant = 'default' | 'selected' | 'removable';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  count?: number;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function Chip({
  label,
  variant = 'default',
  count,
  onClick,
  onRemove,
  className = '',
}: ChipProps) {
  const isSelected = variant === 'selected';
  const isRemovable = variant === 'removable';

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors duration-150',
        onClick ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface-elevated)',
        color: isSelected ? '#ffffff' : 'var(--text-primary)',
        border: isSelected ? 'none' : '1px solid var(--border)',
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {isSelected && <Check size={14} aria-hidden="true" />}
      {label}
      {count !== undefined && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold"
          style={{
            backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : 'var(--primary)',
            color: '#ffffff',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      {isRemovable && (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          aria-label={`Eliminar ${label}`}
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}
