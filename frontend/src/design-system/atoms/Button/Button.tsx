import * as React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2',
  secondary:
    'border hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2',
  ghost: 'hover:opacity-80 focus-visible:ring-2',
  danger:
    'text-white shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2',
  link: 'underline-offset-4 hover:underline focus-visible:ring-2 p-0',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-base rounded-xl gap-2',
  lg: 'px-6 py-3 text-lg rounded-xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={[
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'focus-visible:outline-none',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        VARIANT_CLASSES[variant],
        variant !== 'link' ? SIZE_CLASSES[size] : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor:
          variant === 'primary'
            ? 'var(--primary)'
            : variant === 'danger'
              ? 'var(--error)'
              : variant === 'secondary'
                ? 'transparent'
                : undefined,
        borderColor: variant === 'secondary' ? 'var(--border)' : undefined,
        color:
          variant === 'secondary'
            ? 'var(--text-primary)'
            : variant === 'ghost'
              ? 'var(--text-primary)'
              : variant === 'link'
                ? 'var(--primary)'
                : undefined,
        // focus ring color
        '--tw-ring-color': 'var(--primary)',
      } as React.CSSProperties}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin shrink-0"
          style={{
            width: size === 'sm' ? '14px' : size === 'lg' ? '20px' : '16px',
            height: size === 'sm' ? '14px' : size === 'lg' ? '20px' : '16px',
          }}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
