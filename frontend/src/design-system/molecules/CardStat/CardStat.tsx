import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type DeltaDirection = 'up' | 'down' | 'flat';

interface CardStatProps {
  title: string;
  value: string;
  delta?: { direction: DeltaDirection; label: string };
  onClick?: () => void;
  className?: string;
}

const DELTA_CONFIG: Record<DeltaDirection, { icon: typeof TrendingUp; color: string }> = {
  up: { icon: TrendingUp, color: 'var(--positive)' },
  down: { icon: TrendingDown, color: 'var(--error)' },
  flat: { icon: Minus, color: 'var(--text-tertiary)' },
};

export function CardStat({ title, value, delta, onClick, className = '' }: CardStatProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className={[
        'flex flex-col gap-1 p-4 rounded-xl text-left w-full',
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-tertiary)' }}>
        {title}
      </span>
      <span className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
      {delta && (
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: DELTA_CONFIG[delta.direction].color }}>
          {(() => { const Icon = DELTA_CONFIG[delta.direction].icon; return <Icon size={12} aria-hidden="true" />; })()}
          {delta.label}
        </span>
      )}
    </Tag>
  );
}
