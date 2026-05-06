import { Camera, Flame, Target, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type CelebrationVariant = 'first-scan' | 'streak' | 'savings-goal';

interface CardCelebrationProps {
  variant: CelebrationVariant;
  title: string;
  description: string;
  streakCount?: number;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIG: Record<CelebrationVariant, { icon: LucideIcon; gradient: string; accent: string }> = {
  'first-scan': {
    icon: Camera,
    gradient: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)',
    accent: 'var(--primary)',
  },
  streak: {
    icon: Flame,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    accent: 'var(--warning)',
  },
  'savings-goal': {
    icon: Target,
    gradient: 'linear-gradient(135deg, var(--info) 0%, #6366f1 100%)',
    accent: 'var(--info)',
  },
};

export function CardCelebration({
  variant,
  title,
  description,
  streakCount,
  onDismiss,
  className = '',
}: CardCelebrationProps) {
  const config = VARIANT_CONFIG[variant];
  const IconComp = config.icon;

  return (
    <div
      className={[
        'relative flex flex-col gap-3 p-4 rounded-xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: config.gradient,
        color: '#ffffff',
      }}
      role="status"
      aria-label={title}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.8)' }}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <IconComp size={20} style={{ color: '#ffffff' }} aria-hidden="true" />
        </div>

        {variant === 'streak' && streakCount !== undefined && (
          <span className="text-2xl font-black">{streakCount}</span>
        )}
      </div>

      <div className="flex flex-col gap-1 pr-6">
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {description}
        </p>
      </div>
    </div>
  );
}
