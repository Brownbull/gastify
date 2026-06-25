import type { InputHTMLAttributes, ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * SearchRow — gastify port of Gustify's search row: icon + text input + optional
 * action slot (typically the filter button with active-count badge). Grid layout:
 * icon | input field | action. The bordered field has ink border + hard shadow +
 * focus ring — geometric grammar.
 */
export interface SearchRowProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  icon?: string;
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  /** trailing action slot (filter button, sort button, etc.). */
  action?: ReactNode;
  iconSize?: number;
  className?: string;
}

export function SearchRow({
  icon = "nav-home",
  label,
  value,
  onValueChange,
  action,
  iconSize = 24,
  placeholder,
  className = "",
  ...inputProps
}: SearchRowProps) {
  return (
    <div
      className={`${action ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-gt-8" : "block"} ${className}`}
    >
      <label
        className="grid min-h-11 grid-cols-[24px_minmax(0,1fr)] items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-8 shadow-gt-xs focus-within:ring-4 focus-within:ring-gt-primary/25"
      >
        <PixelIcon name={icon} size={iconSize} />
        <span className="sr-only">{label}</span>
        <input
          className="min-w-0 bg-transparent font-gt-display text-gt-md font-extrabold text-gt-ink outline-none placeholder:font-medium placeholder:text-gt-ink-3"
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange?.(e.currentTarget.value)}
          {...inputProps}
        />
      </label>
      {action}
    </div>
  );
}
