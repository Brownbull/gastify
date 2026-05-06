import * as React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
}: ToggleProps) {
  const toggleId = id || React.useId();

  return (
    <div className={['inline-flex items-center gap-2.5', className].filter(Boolean).join(' ')}>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
        style={{
          backgroundColor: checked ? 'var(--primary)' : 'var(--border)',
        }}
      >
        <span
          className="pointer-events-none inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200"
          style={{
            backgroundColor: '#ffffff',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
      {label && (
        <label
          htmlFor={toggleId}
          className={['text-sm', disabled ? 'opacity-50' : 'cursor-pointer'].join(' ')}
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </label>
      )}
    </div>
  );
}
