type ProgressSize = 'sm' | 'md' | 'lg';
type ProgressColor = 'primary' | 'green' | 'orange' | 'red' | 'blue';

interface ProgressProps {
  value?: number;
  size?: ProgressSize;
  color?: ProgressColor;
  className?: string;
}

const SIZE_CLASSES: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const COLOR_MAP: Record<ProgressColor, string> = {
  primary: 'var(--primary)',
  green: 'var(--positive)',
  orange: 'var(--warning)',
  red: 'var(--error)',
  blue: 'var(--info)',
};

export function Progress({ value, size = 'md', color = 'primary', className = '' }: ProgressProps) {
  const isIndeterminate = value === undefined;
  const clampedValue = isIndeterminate ? undefined : Math.min(100, Math.max(0, value));

  return (
    <div
      className={['w-full rounded-full overflow-hidden', SIZE_CLASSES[size], className]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: 'var(--border)' }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={isIndeterminate ? 'Cargando' : `${clampedValue}%`}
    >
      <div
        className={[
          'h-full rounded-full transition-all duration-300',
          isIndeterminate ? 'animate-indeterminate-progress' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundColor: COLOR_MAP[color],
          width: isIndeterminate ? '40%' : `${clampedValue}%`,
        }}
      />
    </div>
  );
}
