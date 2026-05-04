type DividerOrientation = 'horizontal' | 'vertical';

interface DividerProps {
  orientation?: DividerOrientation;
  label?: string;
  className?: string;
}

export function Divider({ orientation = 'horizontal', label, className = '' }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={['self-stretch w-px', className].filter(Boolean).join(' ')}
        style={{ backgroundColor: 'var(--border)' }}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div
        className={['flex items-center gap-3 w-full', className].filter(Boolean).join(' ')}
        role="separator"
      >
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <hr
      className={['w-full border-none h-px', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--border)' }}
      role="separator"
    />
  );
}
