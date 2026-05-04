import { FileSearch, Filter, Copy } from 'lucide-react';

type CardEmptyVariant = 'primary' | 'filter-empty' | 'filter-empty-duplicates';

interface CardEmptyProps {
  variant?: CardEmptyVariant;
  title: string;
  description?: string;
  ctaLabel?: string;
  onAction?: () => void;
  className?: string;
}

const VARIANT_ICONS: Record<CardEmptyVariant, typeof FileSearch> = {
  primary: FileSearch,
  'filter-empty': Filter,
  'filter-empty-duplicates': Copy,
};

export function CardEmpty({
  variant = 'primary',
  title,
  description,
  ctaLabel,
  onAction,
  className = '',
}: CardEmptyProps) {
  const Icon = VARIANT_ICONS[variant];

  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center px-6 py-12 rounded-xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px dashed var(--border)' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--primary-bg, rgba(99, 102, 241, 0.1))' }}
      >
        <Icon size={24} style={{ color: 'var(--primary)' }} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-4 max-w-[280px]" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      )}
      {ctaLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            backgroundColor: variant === 'primary' ? 'var(--primary)' : 'transparent',
            color: variant === 'primary' ? '#ffffff' : 'var(--primary)',
            border: variant === 'primary' ? 'none' : '1px solid var(--primary)',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
