type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'primary' | 'white' | 'green' | 'orange' | 'red' | 'gray';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string;
  className?: string;
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

const COLOR_MAP: Record<SpinnerColor, string> = {
  primary: 'var(--primary)',
  white: '#ffffff',
  green: 'var(--positive)',
  orange: 'var(--warning)',
  red: 'var(--error)',
  gray: 'var(--text-tertiary)',
};

export function Spinner({ size = 'md', color = 'primary', label, className = '' }: SpinnerProps) {
  const px = SIZE_MAP[size];
  const strokeColor = COLOR_MAP[color];

  const spinner = (
    <svg
      className={['animate-spin', className].filter(Boolean).join(' ')}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label ?? 'Cargando'}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ color: 'var(--border)', opacity: 0.3 }}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  if (label) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </span>
    );
  }

  return spinner;
}
