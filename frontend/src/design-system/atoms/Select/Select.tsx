import * as React from 'react';

type SelectSize = 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  options: readonly SelectOption[];
  placeholder?: string;
  selectSize?: SelectSize;
}

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-4 py-3 text-lg rounded-xl',
};

export function Select({
  label,
  error,
  options,
  placeholder,
  selectSize = 'md',
  disabled,
  id,
  className = '',
  value,
  ...rest
}: SelectProps) {
  const selectId = id || React.useId();
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[
          'w-full border appearance-none transition-colors duration-150',
          'focus:outline-none focus:ring-2',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          SIZE_CLASSES[selectSize],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: error ? 'var(--error)' : 'var(--border)',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          '--tw-ring-color': error ? 'var(--error)' : 'var(--primary)',
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem',
        } as React.CSSProperties}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        value={value}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm" style={{ color: 'var(--error)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
