type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  count: number;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'var(--primary)', text: '#ffffff' },
  success: { bg: 'var(--positive)', text: '#ffffff' },
  warning: { bg: 'var(--warning)', text: '#ffffff' },
  danger: { bg: 'var(--error)', text: '#ffffff' },
};

export function Badge({ count, variant = 'default', className = '' }: BadgeProps) {
  const displayCount = count > 99 ? '99+' : String(count);
  const style = VARIANT_STYLES[variant];

  return (
    <span
      className={[
        'inline-flex items-center justify-center font-bold leading-none',
        'min-w-[20px] h-5 px-1.5 rounded-full text-xs',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: style.bg, color: style.text }}
      aria-label={`${count} notificaciones`}
    >
      {displayCount}
    </span>
  );
}
