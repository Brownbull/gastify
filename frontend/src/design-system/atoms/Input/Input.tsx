import * as React from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: InputSize;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-4 py-3 text-lg rounded-xl',
};

export function Input({
  label,
  error,
  hint,
  inputSize = 'md',
  disabled,
  id,
  className = '',
  ...rest
}: InputProps) {
  const inputId = id || React.useId();
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full border transition-colors duration-150',
          'focus:outline-none focus:ring-2',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          SIZE_CLASSES[inputSize],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: error ? 'var(--error)' : 'var(--border)',
          color: 'var(--text-primary)',
          '--tw-ring-color': error ? 'var(--error)' : 'var(--primary)',
        } as React.CSSProperties}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId || hintId}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-sm" style={{ color: 'var(--error)' }} role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
