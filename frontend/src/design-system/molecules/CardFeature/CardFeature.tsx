import { Gift, Users, Crown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type CardFeatureVariant = 'promotion' | 'cohort' | 'upgrade';

interface CardFeatureProps {
  variant: CardFeatureVariant;
  title: string;
  description: string;
  ctaLabel: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIG: Record<CardFeatureVariant, { icon: LucideIcon; accent: string; bg: string }> = {
  promotion: { icon: Gift, accent: 'var(--warning)', bg: 'rgba(245,158,11,0.08)' },
  cohort: { icon: Users, accent: 'var(--info)', bg: 'rgba(59,130,246,0.08)' },
  upgrade: { icon: Crown, accent: 'var(--primary)', bg: 'rgba(16,185,129,0.08)' },
};

export function CardFeature({
  variant,
  title,
  description,
  ctaLabel,
  onAction,
  onDismiss,
  className = '',
}: CardFeatureProps) {
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
        backgroundColor: config.bg,
        border: `1px solid ${config.accent}`,
      }}
      role="region"
      aria-label={title}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      )}

      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: config.accent }}
      >
        <IconComp size={20} style={{ color: '#ffffff' }} aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1 pr-6">
        <h3
          className="text-sm font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onAction}
        className="self-start px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: config.accent, color: '#ffffff' }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
