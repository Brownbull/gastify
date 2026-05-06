import * as React from 'react';

type PillColor = 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'gray';

interface PillProps {
  color?: PillColor;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const COLOR_STYLES: Record<PillColor, { bg: string; text: string }> = {
  green: { bg: 'var(--primary-light)', text: 'var(--primary)' },
  blue: { bg: '#dbeafe', text: 'var(--secondary)' },
  orange: { bg: '#fed7aa', text: '#c2410c' },
  red: { bg: '#fee2e2', text: 'var(--error)' },
  purple: { bg: '#e9d5ff', text: '#7c3aed' },
  gray: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' },
};

export function Pill({ color = 'gray', icon, children, className = '' }: PillProps) {
  const style = COLOR_STYLES[color];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'max-w-[200px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {icon && (
        <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
